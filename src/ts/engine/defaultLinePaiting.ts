import * as ifc from "../interfaces"

export class DefaultLinePaiting {
    private lineidPrefix: string = "md_line"
    private svgRoot: SVGSVGElement // SVG根节点
    private nodePrefix: string // g 分组节点的ID前缀。
    private svgnamespace: string = "http://www.w3.org/2000/svg"
    private linegroupnode: Element | undefined
    private definestyleid: string = "km_lin_id"
    private rootsvgposition: Position = { X: 0, Y: 0 } // svg节点的绝对位置。用于计算svg中某个子节点的相对svg的位置。

    public LinegroupPrefix: string = "md_l_g_root" // 连线分组根节点前缀。
    public LineFill: string = "none" // 连线的fill属性值
    public LineStroke: string = "rgb(115, 161, 191)" // 连线的stroke属性值
    public LineStrokeWidth: string = "1" // 连线的stroke-width属性值。

    constructor(root: SVGSVGElement, _prefix: string) {
        this.svgRoot = root
        this.nodePrefix = _prefix
        const rootrect: DOMRect = this.svgRoot.getBoundingClientRect()
        this.rootsvgposition.X = rootrect.left
        this.rootsvgposition.Y = rootrect.top
        this.defsStyleInit()
        this.checkLineGroupExists()
    }

    private checkLineGroupExists() {
        const lg = this.svgRoot.querySelector(`#${this.LinegroupPrefix}`)
        if (!lg) {
            // 根节点不存在，创建它。
            this.linegroupnode = document.createElementNS(this.svgnamespace, "g");
            this.linegroupnode.setAttribute("id", this.LinegroupPrefix);
            this.svgRoot.appendChild(this.linegroupnode);
        }
    }

    /**
     * 初始化样式，将样式添加到
     */
    private defsStyleInit() {
        const dfsnode = this.svgRoot.querySelector(`#${this.definestyleid}`)
        if (!dfsnode) {
            // 样式节点不存在，创建它。
            let defsnode = document.createElementNS(this.svgnamespace, "defs")
            this.svgRoot.appendChild(defsnode)
            defsnode.outerHTML = `<defs id="${this.definestyleid}"><linearGradient id="km_lGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(255, 255, 255)"></stop><stop offset="1" stop-color="rgb(204, 204, 204)"></stop></linearGradient><marker id="km_marker_node" orient="auto" refX="6" refY="0" viewBox="-7 -7 14 14" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse"><path fill="rgb(115, 161, 191)" stroke="none" d="M6,0A6,6,0,1,1,-6,0A6,6,0,1,1,6,0"></path></marker></defs>`
        }
    }

    /**
     * 使用连接线将所有一级数据节点与其子节点链接起来。
     * @param data 要渲染节点连接线的数据
     */
    RenderLines(data: ifc.IMindNode[], level: number = 1, rerender: boolean = false): (Error | undefined) {
        if (level <= 0)
            level = 1
            
        for (let index = 0, ct = data.length, temp: ifc.IMindNode, err: ifc.Result; index < ct; index++) {
            temp = data[index]
            err = this.RenderOneNodeLine(temp, level, rerender)
            if (err) {
                return err
            }
        }

        return undefined
    }

    /**
     * 将一个根节点下的所有子节点画上连线。
     * @param nodedata 根节点数据
     * @param level 节点层级，用于区分使用什么连线连接。
     * @returns 异常信息
     */
    private RenderOneNodeLine(nodedata: ifc.IMindNode, level: number, rerender: boolean = false): (Error | undefined) {
        if (!nodedata.Childrens) {
            return undefined
        }

        for (let index = 0; index < nodedata.Childrens.length; index++) {
            const element = nodedata.Childrens[index];
            const rerr = this.RenderTwoNodeLine(nodedata, element, level, rerender)
            if (rerr)
                return rerr;

            if (element.Childrens && element.Childrens.length > 0) {
                const err = this.RenderOneNodeLine(element, level + 1, rerender) // 递归所有子节点。
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
     * @param level 第一个节点层级，用于区分使用什么连线连接。
     * @param rerender 是否重绘，用于刷新已有连线
     * @returns 异常信息
     */
    public RenderTwoNodeLine(first: ifc.IMindNode, second: ifc.IMindNode, level: number, rerender: boolean = false): (Error | undefined) {
        // 获取连线ID。
        // 再判断连线是否已存在，已存在则抛异常。
        const lineid = this.GetLineIDbetweenTwoNode(first, second)
        if (!lineid) {
            return new Error("获取连线ID异常")
        }

        const testline = this.svgRoot.querySelector(`#${lineid}`)
        if (!rerender) {
            if (testline)
                return new Error("数据连线已存在")
        }

        if (!this.linegroupnode) {
            return Error("连线_g节点不存在，无法连线。")
        }

        if (!second.direction) {
            return new Error("内部错误")
        }

        // 获取第一个节点的中心点位置及第二个节点(左/右)边中心点位置信息，并根据这两个点位置，绘制贝塞尔曲线将其连接起来
        // 一级和二级之间的连线用弧线，二级和三级之间的连线用贝塞尔曲线
        // 无论多少级，当N级下面只有一个子元素时，统一都用直线连接。
        let firstnodecenter: Position = { X: 0, Y: 0 } // 第一个节点的中心点位置信息
        const firstnode = this.svgRoot.querySelector(`#${this.nodePrefix}${first.Id}`)
        if (!firstnode) {
            return new Error("未找到指定节点")
        }

        const bd = firstnode.getBoundingClientRect()
        firstnodecenter.X = bd.left - this.rootsvgposition.X + (bd.width / 2)
        firstnodecenter.Y = bd.top - this.rootsvgposition.Y + (bd.height / 2)

        let secondnodepositin: Position = { X: 0, Y: 0 }
        const secondenoe = this.svgRoot.querySelector(`#${this.nodePrefix}${second.Id}`)
        if (!secondenoe)
            return new Error("未找到指定节点")
        const secondbd = secondenoe.getBoundingClientRect()
        secondnodepositin.X = second.direction == "left" ? secondbd.left - this.rootsvgposition.X + secondbd.width : secondbd.left - this.rootsvgposition.X; // 第二个节点要根据方向进行判断是左，还是右。
        secondnodepositin.Y = secondbd.top - this.rootsvgposition.Y + (secondbd.height / 2)

        let dData: string = ""
        

        // 判断两个点之间是否时水平，也就是y值一致，是的话直接直线连接。
        if (firstnodecenter.Y == secondnodepositin.Y) {
            // 使用直线连接
            dData = `M${firstnodecenter.X} ${firstnodecenter.Y}L${secondnodepositin.X} ${secondnodepositin.Y}`
        } else {
            if (level == 1) {
                // 一级和二级之间使用弧线连接
                // 判定 large-arc-flag 使用大角度还是小角度 0=小角度  1=大角度
                // 判定 sweep-flag  使用顺时针绘制，还是逆时针绘制。 0=逆时针绘制  1=顺时针绘制
                let sweepflag: number = 0;
                if (firstnodecenter.X < secondnodepositin.X) {
                    // 第二个点在第一点右边
                    if (firstnodecenter.Y > secondnodepositin.Y) {
                        // 第二个点在第一个点上面
                        sweepflag = 1
                    } else {
                        // 第二个点在第一个点下面
                        sweepflag = 0
                    }
                } else {
                    // 第二点在第一点左边
                    if (firstnodecenter.Y > secondnodepositin.Y) {
                        // 第二点在第一点的上面
                        sweepflag = 0
                    } else {
                        // 第二个点在第一个点下面
                        sweepflag = 1
                    }
                }

                dData = `M${firstnodecenter.X} ${firstnodecenter.Y}A${Math.abs(firstnodecenter.X - secondnodepositin.X) * 2} ${Math.abs(firstnodecenter.Y - secondnodepositin.Y) * 2},0,0,${sweepflag},${secondnodepositin.X - 1} ${secondnodepositin.Y}`
            } else {
                // N>1  N级和N+1之间连线用三次贝塞尔曲线
                // 目前参考：https://blog.csdn.net/zhaozjc112/article/details/52909172  中的ease 动画效果的贝塞尔曲线值比例来使用
                // cubic-bezier (x1,y1,x2,y2) x1,y1为起点控制点，x2,y2为结束点控制点。  ease=cubic-bezier(.42,.0,.58,1)
                let startPoint: Position = { X: 0, Y: 0 } // 起点坐标
                let endPoint: Position = { X: 0, Y: 0 } //终点坐标

                // 需要减去SVG自身位置偏移量this.rootsvgposition
                if (second.direction == "left") {
                    startPoint.X = bd.left - this.rootsvgposition.X
                    startPoint.Y = bd.top + (bd.height / 2) - this.rootsvgposition.Y
                    endPoint.X = secondbd.left + secondbd.width - this.rootsvgposition.X
                    endPoint.Y = secondbd.top + (secondbd.height / 2) - this.rootsvgposition.Y
                } else {
                    startPoint.X = bd.left + bd.width - this.rootsvgposition.X
                    startPoint.Y = bd.top + (bd.height / 2) - this.rootsvgposition.Y
                    endPoint.X = secondbd.left - this.rootsvgposition.X
                    endPoint.Y = secondbd.top + (secondbd.height / 2) - this.rootsvgposition.Y
                }

                const startxPercent = 0.42; // 起点控制点X轴百分比
                const startyPercent = 0; // 起点控制点Y轴百分比
                const endXpercent = 0.58; // 结束点X轴百分比
                const pstart: Position = { X: 0, Y: 0 } // 起点控制点坐标
                const pend: Position = { X: 0, Y: endPoint.Y } // 终点控制点坐标。
                let offsetx = Math.abs(startPoint.X - endPoint.X)
                let offsety = Math.abs(startPoint.Y - endPoint.Y)
                if (startPoint.X > endPoint.X) {
                    // 结束点在起点左边
                    pstart.X = startPoint.X - offsetx * startxPercent
                    pend.X = startPoint.X - offsetx * endXpercent
                    if (startPoint.Y > endPoint.Y) {
                        // 结束点在起点上面
                        pstart.Y = startPoint.Y - offsety * startyPercent
                    } else {
                        // 结束点在起点下面
                        pstart.Y = endPoint.Y + offsety * startyPercent
                    }
                } else {
                    // 结束点在起点右边
                    pstart.X = offsetx * startxPercent + startPoint.X
                    pend.X = offsetx * endXpercent + startPoint.X
                    if (startPoint.Y > endPoint.Y) {
                        // 结束点在起点上面
                        pstart.Y = startPoint.Y - offsety * startyPercent
                    } else {
                        // 结束点在起点下面
                        pstart.Y = offsety * 0.1 + startPoint.Y
                    }
                }

                dData = `M${startPoint.X} ${startPoint.Y}C${pstart.X},${pstart.Y},${pend.X},${pend.Y},${endPoint.X} ${endPoint.Y}`
            }
        }

        if (rerender && testline) {
            testline.setAttribute("d", dData)
            return undefined
        }

        const pathnode = document.createElementNS(this.svgnamespace, "path")
        pathnode.setAttribute("id", lineid)
        pathnode.setAttribute("fill", this.LineFill)
        pathnode.setAttribute("stroke", this.LineStroke)
        pathnode.setAttribute("stroke-width", this.LineStrokeWidth)
        if (!second.Childrens || second.Childrens.length < 1) {
            pathnode.setAttribute("marker-end", "url(#km_marker_node)")
        }

        if (dData) {
            pathnode.setAttribute("d", dData)
            this.linegroupnode!.appendChild(pathnode)
        }

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

interface Position {
    X: number
    Y: number
}