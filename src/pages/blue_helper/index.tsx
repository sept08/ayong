import Taro, { Component, Config } from '@tarojs/taro'
import {View, ScrollView} from '@tarojs/components'
import {
    AtButton, AtCheckbox, AtNavBar, AtNoticebar, AtModal,
    AtModalHeader, AtModalContent, AtInputNumber,
    AtInput, AtIcon, AtMessage,
} from "taro-ui";
import { ab2hex, ab2Str, stringToBytes, regSendData } from '../../utils/helper';
import './index.scss'

interface IState {
    deviceId: string,
    name: string,
    checkedList: Array<string>,
    connectState: string,
    reconnect: string,
    receiveData: string,
    sendText: string,
    rxCount: number,
    txCount: number,
    rxRate: number,
    txRate: number,
    timRX: number,
    timTX: number,
    autoSendInv: number,
    showSetting: boolean,
    connected: boolean,
}
export interface ICheckbox {
    value: string
    label: string
    desc?: string
    disabled?: boolean
}
export default class Index extends Component<{}, IState> {

    config: Config = {
        navigationBarTitleText: '蓝牙串口助手'
    };

    checkboxOption: Array<ICheckbox> = [{
        value: 'send',
        label: '十六进制发送',
    },{
        value: 'rec',
        label: '十六进制接收'
    }];

    _readyRec: boolean = false;
    _hexRec: boolean = false;
    _hexSend: boolean = false;
    serviceu: string = '';
    txdu: string = '';
    rxdu: string = '';
    _deviceId: string = '';
    _characteristicId: string = '';
    _serviceId: string = '';

    constructor () {
        super(...arguments);
        this.state = {
            deviceId: '',
            name: '',
            checkedList: [],
            connectState: '正在连接',
            reconnect: '连接中...',
            receiveData: '',
            sendText: '',
            rxCount: 0,
            txCount: 0,
            rxRate: 0,
            txRate: 0,
            timRX: 0,
            timTX: 0,
            autoSendInv: 100,
            showSetting: false,
            connected: false,
        };
    }

    componentWillMount () {
        const { deviceId, name } = this.$router.params;
        this.setState({ deviceId, name });
        this.connectDevice(deviceId);
    }

    componentDidMount () {
        this.serviceu = Taro.getStorageSync('mserviceuuid').toUpperCase();
        this.txdu = Taro.getStorageSync('mtxduuid').toUpperCase();
        this.rxdu = Taro.getStorageSync('mrxduuid').toUpperCase();
    }

    componentWillUnmount () { }

    componentDidShow () { }

    componentDidHide () { }

    goclear = () => {
        this.setState({
            receiveData: "",
            rxCount: 0,
            txCount: 0,
        })
    };

    godisconnect = () => {
        const { connected, deviceId } = this.state;
        if (connected){
            Taro.closeBLEConnection({ deviceId})
            this.setState({
                connected: false,
                reconnect:"重新连接",
                connectState: "已断开",
            })
        }else{
            this.setState({
                connectState: "正在连接",
                reconnect: "连接中...",
            });
            Taro.createBLEConnection({ deviceId })
                .then(() => {
                    this.setState({
                        connected: true,
                        connectState: "读取服务",
                        reconnect: "断开连接",
                        receiveData: "",
                        rxCount: 0,
                        txCount: 0,
                    });
                    this.getBLEDeviceServices(deviceId)
                });
        }
    };

    goautosend = () => {
        Taro.atMessage({ message: "自动发送功能暂未开发...", type: "warning" });
    };

    gosend = () => {
        const { connected, sendText } = this.state;
        if (!connected){
            Taro.atMessage({ message: "请先连接BLE设备...", type: "warning" });
            return;
        }
        var hex = sendText || ''; //要发送的数据
        let buffer1;
        if (this._hexSend && hex){ //十六进制发送
            var typedArray = new Uint8Array(regSendData(hex).map(function (h) {
                return parseInt(h, 16)
            }));
            buffer1 = typedArray.buffer
        }else{ //string发送
            var strbuf = new Uint8Array(stringToBytes(hex));
            buffer1 = strbuf.buffer
        }
        if (buffer1==null) return
        const txlen = buffer1.byteLength;
        Taro.writeBLECharacteristicValue({
            deviceId: this._deviceId,
            serviceId: this._serviceId,
            characteristicId: this._characteristicId,
            value: buffer1,
        }).then(() => {
            this.setState({
                txCount: this.state.txCount + txlen,
                timTX:this.state.timTX + txlen
            })
        }).catch(err => console.log(err));
    };

    changeCheckbox = (value) => {
        this._hexSend = value.indexOf('send') > -1;
        this._hexRec = value.indexOf('res') > -1;
        this.setState({ checkedList: value });
    };

    changeAutoSendInv = () => {};

    showSetting = () => {
        this.setState({ showSetting: true });
    };

    closeSendSetting = () => {
        this.setState({ showSetting: false });
    };

    changeSendText = (value) => {
        this.setState({ sendText: value })
    };

    // 连接设备
    connectDevice = (deviceId) => {
        Taro.createBLEConnection({ deviceId })
            .then(() => {
                this.setState({
                    connected: true,
                    connectState: "读取服务",
                    reconnect: "断开连接",
                })
                this.getBLEDeviceServices(deviceId);
            });
    };

    getBLEDeviceServices = (deviceId) => {
        Taro.getBLEDeviceServices({deviceId})
            .then((res) => {
                let isService = false
                for (let i = 0; i < res.services.length; i++) {
                    if (this.serviceu == res.services[i].uuid) {
                        isService = true;
                        this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid);
                        this.setState({ connectState: "获取特征值" });
                    }
                }
                if (!isService) {
                    this.setState({ connectState: "UUID错误" });
                    Taro.atMessage({ message: "找不到目标服务UUID  请确认UUID是否设置正确或重新连接", type: "error" });
                }
            })
    };

    getBLEDeviceCharacteristics = (deviceId, serviceId) => {
        Taro.getBLEDeviceCharacteristics({ deviceId, serviceId })
            .then((res) => {
                let ismy_service = false;
                if (serviceId == this.serviceu) {
                    ismy_service = true;
                }
                for (let i = 0; i < res.characteristics.length; i++) {
                    let item = res.characteristics[i];
                    if (item.properties.read) {
                        Taro.readBLECharacteristicValue({
                            deviceId,
                            serviceId,
                            characteristicId: item.uuid,
                        });
                    }
                    if (item.properties.write) {
                        this._deviceId = deviceId;
                        if (ismy_service && (this.txdu == item.uuid)){
                            this._characteristicId = item.uuid;
                            this._serviceId = serviceId
                        }
                    }
                    if (item.properties.notify || item.properties.indicate) {
                        if (ismy_service && (this.rxdu == item.uuid)){
                            Taro.notifyBLECharacteristicValueChange({
                                deviceId,
                                serviceId,
                                characteristicId: item.uuid,
                                state: true,
                            }).then(() => {
                                this.setState({ connectState: "连接成功" });
                                this._readyRec=true
                            })
                        }
                    }
                }
            })
            .catch(err => console.log('getBLEDeviceCharacteristics', err));
        // 操作之前先监听，保证第一时间获取数据
        Taro.onBLECharacteristicValueChange((characteristic) => {
            const buf = new Uint8Array(characteristic.value);
            const nowrecHEX = ab2hex(characteristic.value);
            const recStr = ab2Str(characteristic.value);
            if (this.rxdu != characteristic.characteristicId) return;
            if (!this._readyRec) return;
            let mrecstr
            if (this._hexRec){
                mrecstr = nowrecHEX
            }else{
                mrecstr = recStr
            }
            let receiveData = this.state.receiveData;
            if (this.state.receiveData.length>3000){
                receiveData = receiveData.substring(mrecstr.length, receiveData.length)
            }
            this.setState({
                receiveData: receiveData + mrecstr,
                rxCount: this.state.rxCount + buf.length,
                timRX: this.state.timRX + buf.length
            })
        })
    };

    render () {
        const {
            checkedList, connectState, autoSendInv, showSetting,
            rxRate, txRate, rxCount, txCount, receiveData, sendText,
            reconnect,
        } = this.state;
        return (
            <View className='index'>
                <AtMessage />
                <View className='layout'>
                    <AtNavBar
                        onClickRgIconSt={this.showSetting}
                        title={connectState}
                        rightFirstIconType='settings'
                    />
                    <AtNoticebar
                        single
                        icon='volume-plus'
                    >
                        RX:{rxRate}B/s, TX:{txRate}B/S
                    </AtNoticebar>
                    <AtNoticebar
                        single
                        icon='volume-plus'
                    >
                        RX:{rxCount}, TX:{txCount}
                    </AtNoticebar>
                    <View className='at-row at-row__justify--around'>
                        <AtButton
                            className='btn'
                            type='secondary'
                            onClick={this.goclear}
                        >
                            清屏
                        </AtButton>
                        <AtButton
                            className='btn'
                            type='primary'
                            onClick={this.godisconnect}
                        >
                            {reconnect}
                        </AtButton>
                    </View>
                    <ScrollView
                        className='receive'
                    >
                        <View>{receiveData}</View>
                    </ScrollView>
                    <View className='send'>
                        <AtInput
                            name='send'
                            clear
                            type='text'
                            placeholder='发送数据'
                            value={sendText}
                            onChange={this.changeSendText}
                        >
                            <AtIcon
                                value='repeat-play'
                                size='30'
                                color='#6190E8'
                                onClick={this.goautosend}
                            />
                            <AtIcon
                                value='play'
                                size='30'
                                color='#6190E8'
                                onClick={this.gosend}
                            />
                        </AtInput>
                    </View>
                </View>

                <AtModal
                    isOpened={showSetting}
                    onClose={this.closeSendSetting}
                >
                    <AtModalHeader>设置</AtModalHeader>
                    <AtModalContent>
                        <View className='at-article__h3'>收发方式</View>
                        <AtCheckbox
                            options={this.checkboxOption}
                            selectedList={checkedList}
                            onChange={this.changeCheckbox}
                        />
                        <View className='at-article__h3'>自动发送周期(ms)</View>
                        <AtInputNumber
                            type='number'
                            min={1}
                            max={1000000}
                            step={100}
                            width={370}
                            value={autoSendInv}
                            onChange={this.changeAutoSendInv}
                         />
                    </AtModalContent>
                </AtModal>
            </View>
        )
    }
}
