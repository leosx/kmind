import { IMindOption, IDataSchema, IContextMenu } from "./interfaces/index"

/**
 * 自定义的Xmind，以便实现知识分享上的功能
 */
export default class SXMind {
    // 根元素，用于承载Mind
    private rootSelector: string
    private rootElement: Element | undefined | null
    private svgRoot: SVGSVGElement | undefined
    // 初始化选项
    private options: IMindOption
    constructor(selector: string, options: IMindOption = {}) {
        this.rootSelector = selector
        this.options = options
        this.rootElement = null
        this.init()
    }

    private init() {
        let rootarrary = document.querySelectorAll(this.rootSelector)
        if (rootarrary.length <= 0) {
            throw new Error("未能找到根元素")
        } else if (rootarrary.length > 1) {
            throw new Error("找到多个根元素，请确保唯一根")
        }

        this.rootElement = rootarrary[0]

        // 判断节点中是否包含了svg根元素。
        let svgs = this.rootElement.querySelectorAll("svg")
        if (svgs.length <= 0) {
            // 未初始化
            let svgele: any = document.createElement("svg");
            this.svgRoot = svgele as SVGSVGElement;
            this.svgRoot.setAttribute("version", "1.1")
            this.svgRoot.setAttribute("xmlns", "http://www.w3.org/2000/svg")
            this.svgRoot.setAttribute("baseProfile", "full")
            this.svgRoot.setAttribute("width", this.options.width || "100%")
            this.svgRoot.setAttribute("height", this.options.height || "100%")
            this.rootElement.appendChild(this.svgRoot)
        } else {
            // 有多个SVG??
            throw new Error("不能多次初始化同一个根节点")
        }

        if (this.options.Data) {
            this.LoadData(this.options.Data)
        }
    }

    /**
     * 初始化数据
     * @param data 数据
     */
    public LoadData(data: Array<IDataSchema>): void {

    }
}