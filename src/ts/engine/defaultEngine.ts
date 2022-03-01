import * as ifc from "../interfaces"

interface NodeKey {
    Did: string
    ZoneType: string
    Left: string
    Right: string
    Content: string
}

/**
 * 默认的渲染引擎。
 * 除了根节点外：
 * 第一级使用奇偶数进行左右布局
 * 第二级外形不再是方框
 */
export class DefaultEngine implements ifc.IEngine {
    private rootElement: Element | undefined // 容器根元素
    private svgRoot: SVGSVGElement | undefined // SVG根节点
    private options: ifc.IMindOption // 参数选项
    private grouproot: Element | undefined // 整个绘图分组，用于整体移动、变换等操作
    private connectg: Element | undefined // 连接线分组
    private renderg: Element | undefined // 渲染节点分组
    private svgnamespace: string = "http://www.w3.org/2000/svg"

    // 用于标识节点区域的key
    private keyNames: NodeKey = {
        Did: "did",
        ZoneType: "zone",
        Left: "left",
        Right: "right",
        Content: "content"
    }

    constructor(root: Element, svgRoot: SVGSVGElement, options: ifc.IMindOption) {
        this.rootElement = root
        this.svgRoot = svgRoot
        this.options = options
        this.CheckZones()
    }

    /**
     * 用于检查是否有关系组和节点组，没有的话补充
     */
    private CheckZones() {
        if (!this.svgRoot) {
            throw new Error("根节点不为空，请核实")
        }
        let grouproot = this.svgRoot.querySelector("#groot")
        if (grouproot) {
            throw new Error("根节点不为空，请核实")
        }
        this.grouproot = document.createElementNS(this.svgnamespace, "g")
        this.grouproot.setAttribute("id", "groot")
        this.svgRoot.appendChild(this.grouproot)


        let connectgroup = this.svgRoot.querySelector("#connectgroup")
        if (connectgroup) {
            throw new Error("根节点不为空，请核实")
        }
        this.connectg = document.createElementNS(this.svgnamespace, "g")
        this.connectg.setAttribute("id", "connectgroup")
        this.grouproot.appendChild(this.connectg)


        let renderzone = this.svgRoot.querySelector("#render")
        if (renderzone) {
            throw new Error("根节点不为空，请核实")
        }
        this.renderg = document.createElementNS(this.svgnamespace, "g")
        this.renderg.setAttribute("id", "render")
        this.grouproot.appendChild(this.renderg)
    }

    RenderStyle(): ifc.Result {
        // TODO: 暂不实现
    }
    RenderBody(data: ifc.IMindNode[]): ifc.Result {
        // 如果有多个根节点，应该不同节点进行平铺
        // 一个根节点一个g，以便后续整体移动、缩放等操作。
        for (let index = 0, ct = data.length, temp, err; index < ct; index++) {
            temp = data[index]
            err = this.RenderSingleNode(temp)
            if (err) {
                return err
            }
        }
    }

    RenderSingleNode(nodedata: ifc.IMindNode): ifc.Result {
        // 生成节点、同时记录其关系信息
        let gp = document.createElementNS(this.svgnamespace, "g");
        (gp as HTMLElement).dataset[this.keyNames.Did] = nodedata.Id.toString()

        let leftg = document.createElementNS(this.svgnamespace, "g");
        (leftg as HTMLElement).dataset[this.keyNames.ZoneType] = this.keyNames.Left

        let contentg = document.createElementNS(this.svgnamespace, "g");
        (contentg as HTMLElement).dataset[this.keyNames.ZoneType] = this.keyNames.Content

        let rightg = document.createElementNS(this.svgnamespace, "g");
        (rightg as HTMLElement).dataset[this.keyNames.ZoneType] = this.keyNames.Right

        gp.appendChild(leftg)
        gp.appendChild(contentg)
        gp.appendChild(rightg)

        let rect = document.createElementNS(this.svgnamespace, "rect")
        rect.setAttribute("width", "130")
        rect.setAttribute("height", "40")
        rect.setAttribute("rx", "5")
        rect.setAttribute("ry", "5")
        rect.setAttribute("style", "stroke:black;fill:none;")
        contentg.appendChild(rect);

        (gp as HTMLElement).addEventListener("click",function(e){
            debugger
        })
        this.renderg?.appendChild(gp)
    }
}