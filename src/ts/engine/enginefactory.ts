import * as eg from "./defaultEngine"
import * as ifc from "../interfaces"


/**
 * 目前只有默认渲染引擎，为了扩展性，后续可以修改这里进行调整
 * @param arg 参数
 * @returns 渲染引擎
 */
export function GetEngine(root: Element, svgRoot: SVGSVGElement, options: ifc.IMindOption, ...arg: any): ifc.IEngine {
    return new eg.DefaultEngine(root, svgRoot, options)
}