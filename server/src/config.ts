import { mergeDeep } from "../../common/src/utils/misc";
import { type ConfigType, DefaultConfig } from "./defaultConfig";

export const Config = mergeDeep<ConfigType>(DefaultConfig, {

});
