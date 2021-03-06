import Taro, { useState, useEffect, useRouter, useCallback, useDidHide } from "@tarojs/taro";
import { Button, View } from "@tarojs/components";
import { AtMessage } from 'taro-ui';
import { useBlueToothDevice } from "@hooks/bluetooth-device";
import ControlPanel from "./control-panel";
import ConfigParams from "./config-params";
import './index.scss'

function Device() {
    const router = useRouter();
    const { deviceId, name } = router.params;
    const [connectLoading, setConnectLoading] = useState(false);
    const {connected, message, connectDevice, disconnectDevice, sendCommander, receiveData} = useBlueToothDevice();

    useEffect(() => {
        Taro.setNavigationBarTitle({ title: name })
        return () => {
            disconnectDevice(deviceId);
        }
    }, [])

    useDidHide(() => {
        disconnectDevice(deviceId)
    });

    // 点击连接/断开连接，loading
    const handleConnect = useCallback(() => {
        if (connected) {
            disconnectDevice(deviceId);
        } else {
            connectDevice(deviceId, setConnectLoading);
        }
    }, [connected])

    return (
        <View className="device">
            <AtMessage />
            <ControlPanel connected={connected} sendCommand={sendCommander} receiveData={receiveData} />
            <ConfigParams connected={connected} sendCommand={sendCommander} receiveData={receiveData} />
            <Button
                loading={connectLoading}
                className={`connect-btn ${connected ? 'on' : ''}`}
                onClick={handleConnect}
            >
                <View>
                    <View className="btn-handle">{ connected ? '断开设备' : '连接设备'}</View>
                    <View className="btn-status">(当前状态：{message})</View>
                </View>
            </Button>
        </View>
    )
}

export default Device;
