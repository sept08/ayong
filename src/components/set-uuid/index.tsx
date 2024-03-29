import Taro, {useEffect, useState} from "@tarojs/taro";
import { View } from "@tarojs/components";
import { AtFloatLayout, AtInput, AtRadio } from "taro-ui";
// @ts-ignore
import { MODE_TYPE, defaultUuid, bt4502Uuid } from "@common/const/uuid";
// @ts-ignore
import { strToUUID } from "@common/utils/data-handle";

/**
 * 设置uuid，自定义uuid的修改需要持久化
 * @param showSetting
 * @param uuid
 * @constructor
 */
function SetUuid({ showSetting= false, onChangeUuid }) {
    const [modeType, setModeType] = useState(MODE_TYPE.bt4502);
    const [customUuid, setCustomUuid] = useState(defaultUuid);

    useEffect(() => {
        // 从持久化数据中重置数据
        const modelType = Taro.getStorageSync('modeType');
        const customUuid = Taro.getStorageSync('customUuid');
        setModeType(modelType || MODE_TYPE.bt4502);
        setCustomUuid(customUuid || defaultUuid);
    }, []);

    const changeUuidInput = (_value, event) => {
        const id = event.currentTarget.id;
        const uuid = strToUUID(event.currentTarget.value);
        if (uuid !== customUuid[id]) {
            setCustomUuid({ ...customUuid, [id]: uuid })
        }
        return uuid
    };

    const updateUuidInfoAtClose = () => {
        // 持久化模组类型
        Taro.setStorageSync('modeType', modeType);
        if (modeType === MODE_TYPE.custom) Taro.setStorageSync('customUuid', customUuid);
        const uuid = {
            [MODE_TYPE.default]: defaultUuid,
            [MODE_TYPE.bt4502]: bt4502Uuid,
            [MODE_TYPE.custom]: customUuid,
        }[modeType];
        onChangeUuid(uuid);
    };

    return (
        <View>
            <AtFloatLayout
                title="设置模组"
                isOpened={showSetting}
                scrollY
                onClose={updateUuidInfoAtClose}
            >
                <AtRadio
                    options={[
                        { label: '常规模组', value: MODE_TYPE.default },
                        { label: 'BT4502模组', value: MODE_TYPE.bt4502 },
                        { label: '制定UUID', value: MODE_TYPE.custom },
                    ]}
                    value={modeType}
                    onClick={value => setModeType(value)}
                />
                <View>
                    <AtInput
                        name='serviceuuid'
                        editable={modeType === MODE_TYPE.custom}
                        title='Service'
                        type='text'
                        maxLength={37}
                        value={customUuid.serviceuuid}
                        onChange={changeUuidInput}
                    />
                    <AtInput
                        name='txduuid'
                        editable={modeType === MODE_TYPE.custom}
                        title='Notify'
                        type='text'
                        maxLength={37}
                        value={customUuid.txduuid}
                        onChange={changeUuidInput}
                    />
                    <AtInput
                        name='rxduuid'
                        editable={modeType === MODE_TYPE.custom}
                        title='Write'
                        type='text'
                        maxLength={37}
                        value={customUuid.rxduuid}
                        onChange={changeUuidInput}
                    />
                </View>
            </AtFloatLayout>
        </View>
    )
}

export default SetUuid;
