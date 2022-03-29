import * as ifc from "../interfaces"

export class DefaultLinePaiting {
    private lineidPrefix: string = "md_line"
    private svgRoot: SVGSVGElement // SVG根节点
    private nodePrefix: string // g 分组节点的ID前缀。
    public LinegroupPrefix: string = "md_l_g_root" // 连线分组根节点前缀。
    private svgnamespace: string = "http://www.w3.org/2000/svg"
    private linegroupnode: Element | undefined
    constructor(root: SVGSVGElement, _prefix: string) {
        this.svgRoot = root
        this.nodePrefix = _prefix
        this.checkLineGroupExists()
    }

    private checkLineGroupExists() {
        const lg = this.svgRoot.querySelector(`#${this.LinegroupPrefix}`)
        if (!lg) {
            // 根节点不存在，创建它。
            this.linegroupnode = document.createElementNS(this.svgnamespace, "g")
            this.linegroupnode.setAttribute("id", this.LinegroupPrefix);
            this.svgRoot.appendChild(this.linegroupnode)
        }
    }

    /**
     * 使用连接线将数据节点链接起来。
     * @param data 要渲染节点连接线的数据
     */
    RenderLines(data: ifc.IMindNode[]): (Error | undefined) {
        for (let index = 0, ct = data.length, temp: ifc.IMindNode, err: ifc.Result; index < ct; index++) {
            temp = data[index]
            err = this.RenderOneNodeLine(temp)
            if (err) {
                return err
            }
        }

        return undefined
    }

    /**
     * 将一个根节点下的所有子节点画上连线。
     * @param nodedata 根节点数据
     * @returns 异常信息
     */
    private RenderOneNodeLine(nodedata: ifc.IMindNode): (Error | undefined) {
        if (!nodedata.Childrens) {
            return undefined
        }

        for (let index = 0; index < nodedata.Childrens.length; index++) {
            const element = nodedata.Childrens[index];
            const rerr = this.RenderTwoNodeLine(nodedata, element)
            if (rerr)
                return rerr;

            if (element.Childrens && element.Childrens.length > 0) {
                const err = this.RenderOneNodeLine(element) // 递归所有子节点。
                if (err)
                    return err; // 有错误的话直接终端并返回错误
            }
        }
        return undefined
    }

    /**
     * 将两个节点使用连线连接起来。
     * @param first 第一个节点
     * @param second 第二个节点
     * @returns 异常信息
     */
    private RenderTwoNodeLine(first: ifc.IMindNode, second: ifc.IMindNode): (Error | undefined) {
        // 获取连线ID。
        // 再判断连线是否已存在，已存在则抛异常。
        const lineid = this.GetLineIDbetweenTwoNode(first, second)
        if (!lineid) {
            return new Error("获取连线ID异常")
        }

        const testline = this.svgRoot.querySelector(`#${lineid}`)
        if (testline) {
            return new Error("数据连线已存在")
        }

        // 获取两个节点的中心点位置，并根据这两个中心点位置，绘制贝塞尔曲线将其连接起来

        return undefined
    }

    /**
     * 根据两个节点数据，获取他们之间的连线ID。
     * @param first 第一个数据节点
     * @param second 第二个数据节点
     * @returns 连线ID
     */
    GetLineIDbetweenTwoNode(first: ifc.IMindNode, second: ifc.IMindNode): string {
        return `${this.lineidPrefix}_${first.Id}_${second.Id}`
    }
}