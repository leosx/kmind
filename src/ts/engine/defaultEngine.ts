import * as ifc from "../interfaces"
import { EventEmitter } from 'events';

/**
 * 节点的数据属性名称
 */
interface NodeKey {
    Did: string
    ZoneType: string
    Left: string
    Right: string
    Content: string
}

// 一级节点填充色；所有节点边框色都是他
const FirstLevelColor: string = "rgb(115, 161, 191)"
// 所有层级的边框色
const StorkeColor: string = "rgb(115, 161, 191)"
// 二级节点填充色
const SecondLevelColor: string = "rgb(238, 243, 246)"

// 节点文本组(g)的ID名称前缀
const TextGroupIDPrefix: string = "mind_txtgroupid_"

// 节点文本背景路径id前缀
const NodeTextBGPrefix: string = "mind_txtbgid_"

// 节点文本(text)的ID名称前缀
const TextIDPrefix: string = "mind_txtid_"

// 节点根分组ID前缀
const NodeRootPrefix: string = "ndrootg_"

// 节点左侧子数据区域分组ID前缀
const NodeLeftZonePrefix: string = "ndleftg_"

// 节点内容区域分组ID前缀
const NodeContentZonePrefix: string = "ndcontentg_"

// 节点右侧子数据区域分组ID前缀
const NodeRightZonePrefix: string = "ndrightg_"

// 默认连线X轴距离
const DefaultLineWidth: number = 100

// 默认同区域两项节点的高度距离
const DefaultLineHeight: number = 30

interface MouseXY {
    X: number
    Y: number
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
    private renderddata: ifc.IMindNode[]
    private buttondown: number = -1 // 指示鼠标按下去时，是左键、中键还是右键
    private mousedownxy: MouseXY = { X: 0, Y: 0 }
    private roottraslatexy: MouseXY = { X: 0, Y: 0 }


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
        this.renderddata = []
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
        this.grouproot.setAttribute("id", "groot");
        this.svgRoot.addEventListener("mousedown", (e) => {
            this.buttondown = e.button
            if (e.button == 2) {
                if (!this.grouproot) {
                    return
                }
                this.mousedownxy.X = e.x
                this.mousedownxy.Y = e.y
                this.roottraslatexy.X = 0
                this.roottraslatexy.Y = 0
                let groottranslatestr = this.grouproot.getAttribute("transform")
                if (groottranslatestr) {
                    let translatexyarray = groottranslatestr.replace("translate(", "").replace(")", "").trim().split(" ")
                    if (translatexyarray.length == 2) {
                        this.roottraslatexy.X = Number(translatexyarray[0])
                        this.roottraslatexy.Y = Number(translatexyarray[1])
                    }
                }
            }
        });
        this.svgRoot.addEventListener("mousemove", (e: MouseEvent) => {
            if (this.buttondown == 2) {
                this.MoveCanvas(e)
            }
        });
        this.svgRoot.addEventListener("mouseup", (e: MouseEvent) => {
            this.buttondown = -1
            this.mousedownxy.X = -1
            this.mousedownxy.Y = -1
            this.roottraslatexy.X = 0
            this.roottraslatexy.Y = 0
        });

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
    async RenderBody(data: ifc.IMindNode[]): Promise<ifc.Result> {
        this.renderddata = data
        // 如果有多个根节点，应该不同节点进行平铺
        // 一个根节点一个g，以便后续整体移动、缩放等操作。
        for (let index = 0, ct = data.length, temp: ifc.IMindNode, err: ifc.Result; index < ct; index++) {
            temp = data[index]
            err = await this.RenderSingleNode(1, this.renderg!, temp)
            if (err) {
                return err
            }
        }
    }

    /**
     * 将单个节点渲染到其父级容器上去。
     * @param container 父级容器 
     * @param nodedata 节点数据
     */
    private async RenderSingleNode(level: number, container: Element, nodedata: ifc.IMindNode): Promise<ifc.Result> {
        // 生成节点、同时记录其关系信息
        let gp = document.createElementNS(this.svgnamespace, "g");
        gp.setAttribute("id", `${NodeRootPrefix}${nodedata.Id}`);
        (gp as HTMLElement).dataset.level = level.toString();

        let leftg = document.createElementNS(this.svgnamespace, "g");
        leftg.setAttribute("id", `${NodeLeftZonePrefix}${nodedata.Id}`);

        let contentg = document.createElementNS(this.svgnamespace, "g");
        contentg.setAttribute("id", `${NodeContentZonePrefix}${nodedata.Id}`);

        let rightg = document.createElementNS(this.svgnamespace, "g");
        rightg.setAttribute("id", `${NodeRightZonePrefix}${nodedata.Id}`);

        gp.appendChild(leftg)
        gp.appendChild(contentg)
        gp.appendChild(rightg)
        container.appendChild(gp)
        // 绘制文本
        await this.CreateNodeText(contentg, nodedata, (level == 1 ? FirstLevelColor : SecondLevelColor), StorkeColor, (level == 1 ? 40 : 30), 10);

        if (nodedata.Childrens && nodedata.Childrens.length > 0) {
            for (let index: number = 0, ct: number = nodedata.Childrens.length, subnode: ifc.IMindNode; index < ct; index++) {
                subnode = nodedata.Childrens[index]
                // 先将所有子节点渲染完成，再调整位置
                let rootcontainer: Element
                if (level == 1) {
                    if ((index + 1) % 2 == 0) {
                        rootcontainer = leftg
                        subnode.direction = "left"
                    } else {
                        rootcontainer = rightg
                        subnode.direction = "right"
                    }
                } else {
                    if (!nodedata.direction) {
                        throw new Error("渲染内部错误")
                    }
                    subnode.direction = nodedata.direction

                    if (subnode.direction == "left") {
                        rootcontainer = leftg
                    } else {
                        rootcontainer = rightg
                    }
                }
                await this.RenderSingleNode(level + 1, rootcontainer, subnode)
            }

            // 调整所有子节点高差
            this.AdjustNodeHeight(leftg)
            this.AdjustNodeHeight(rightg)

            // 调整左右区域位置
            // 调整左、内容、右区域的X轴值，y轴值。
            let contentgrect = contentg.getBoundingClientRect()
            let leftgrect = leftg.getBoundingClientRect()
            let rightgrect = rightg.getBoundingClientRect()
            let maxY = leftgrect.height
            if (contentgrect.height > maxY) {
                maxY = contentgrect.height
            }
            if (rightgrect.height > maxY) {
                maxY = rightgrect.height
            }

            let centy = maxY / 2
            let centcontenty = contentgrect.height / 2

            if (leftgrect.height < maxY) {
                leftg.setAttribute("transform", `translate( 0 ${centy - (leftgrect.height / 2)} )`)
            }

            // 移动content
            let hasleftrect = false
            if (leftgrect.width > 0) {
                hasleftrect = true
                contentg.setAttribute("transform", `translate( ${leftgrect.width + DefaultLineWidth} ${centy - centcontenty} )`)
            } else {
                contentg.setAttribute("transform", `translate( 0 ${centy - centcontenty} )`)
            }

            if (leftgrect.width + contentgrect.width > 0) {
                rightg.setAttribute("transform", `translate( ${leftgrect.width + contentgrect.width + (hasleftrect ? DefaultLineWidth * 2 : DefaultLineWidth)} ${centy - (rightgrect.height / 2)} )`)
            }
        }

        // 注册事件
        (gp as HTMLElement).addEventListener("mousedown", (e) => {
            this.buttondown = e.button
            this.mousedownxy.X = e.x
            this.mousedownxy.Y = e.y
        });
        (gp as HTMLElement).addEventListener("mouseup", (e) => {
            this.buttondown = -1
            this.mousedownxy.X = -1
            this.mousedownxy.Y = -1
        });
        (gp as HTMLElement).addEventListener("mousemove", (e) => {
            if (this.buttondown == -1) {
                return
            } else if (this.buttondown == 0) {
                // 按下了左键，移动此节点，并重回大小
            }
        });
    }

    /**
     * 平移整个画布
     * @param e 鼠标事件参数e
     */
    private MoveCanvas(e: MouseEvent) {
        if (this.buttondown != 2) {
            return
        }

        if (!this.grouproot) {
            return
        }

        let offsetx = e.x - this.mousedownxy.X
        let offsety = e.y - this.mousedownxy.Y
        if (Math.abs(offsetx) < 3 || Math.abs(offsety) < 3) {
            // 移动距离过小则不触发移动
            return
        }

        let oldx = this.roottraslatexy.X
        let oldy = this.roottraslatexy.Y
        let newx = oldx + offsetx
        let newy = oldy + offsety
        this.grouproot.setAttribute("transform", `translate( ${newx} ${newy} )`)
    }

    /**
     * 调整某个区域下的子元素的高度位置
     * @param container 左/右区域容器
     */
    private AdjustNodeHeight(container: Element) {
        if (container.children.length > 0) {
            let prenoderect: DOMRect | undefined = undefined
            let startheight: number = 0
            for (let index: number = 0, ct: number = container.children.length, node: Element, noderect: DOMRect; index < ct; index++) {
                node = container.children[index]
                noderect = node.getBoundingClientRect()
                if (!prenoderect) {
                    startheight = 0
                } else {
                    startheight += (prenoderect.height + DefaultLineHeight)
                }
                prenoderect = noderect

                if (startheight > 0) {
                    node.setAttribute("transform", `translate( ${0} ${startheight} )`)
                }
            }
        }
    }

    /**
     * 创建一个文本节点，可以指定边框、背景色、字体大小、字体颜色等信息
     * @param root 防止节点的父级标签元素
     * @param nodedata 节点数据信息
     * @param fill 填充颜色
     * @param stroke 边框颜色
     * @param raduis 圆角半径
     * @param storkewidth 边框宽度
     * @param txtcolor 文本颜色
     * @param fontsize 文本字体大小
     */
    private async CreateNodeText(root: Element, nodedata: ifc.IMindNode, fill: string, stroke: string, lineHeight: number, raduis: number = 3, storkewidth: number = 1, txtcolor: string = "red", fontsize: number = 16) {
        return new Promise((res, rej) => {
            // 创建节点流程，由于不知道节点文本最终真实会占用多少宽高，所以先渲染text文本，再调整背景框大小以包裹住文本，再使用矩阵变换调整位置
            // (root as HTMLElement).style.visibility = "hidden"
            let rect = this.CreateRectPath(nodedata, fill, stroke, raduis, storkewidth)
            let txtele = this.RenderText(nodedata.Id.toString(), nodedata.Name, fontsize, txtcolor);
            let tempsvgroot = this.svgRoot
            let that = this
            // 获取文本宽高，调整背景框大小  DOMNodeInsertedIntoDocument
            txtele.addEventListener("DOMNodeInsertedIntoDocument", function (this: Element, e) {
                let cr = this.getBoundingClientRect()
                let newddata = that.GetPathDAttributeData(0, 0, cr.width + 40, lineHeight, raduis);
                rect.setAttribute("d", newddata);  // 修正背景框大小
                let bgrect = rect.getBoundingClientRect()
                let txtg = tempsvgroot?.querySelector(`#${TextGroupIDPrefix}${nodedata.Id}`)
                let x1 = cr.width / 2
                let y1 = cr.height / 2
                let x2 = bgrect.width / 2
                let y2 = bgrect.height / 2

                let tx = x2 - x1
                let ty = y2 - y1

                txtg?.setAttribute("transform", `translate( ${tx} ${ty + 16} )`); // 平移文本到背景上居中对其
                // (root as HTMLElement).style.visibility = "visible"
                res("")
            });
            root.appendChild(rect);
            root.appendChild(txtele);
        })
    }

    /**
     * 使用Path绘制一个矩形，用以充当节点矩形外框
     * @param fill 填充色
     * @param storke 边框色
     * @param x 矩形所在X轴位置
     * @param y 矩形所在Y轴位置
     * @param width 矩形宽度
     * @param height 矩形高度
     * @param raduis 圆角半径值
     * @param storkewidth 边框宽度
     */
    private CreateRectPath(nodedata: ifc.IMindNode, fill: string, stroke: string, raduis: number = 3, storkewidth: number = 1): Element {
        let pt = document.createElementNS(this.svgnamespace, "path")
        pt.setAttribute("id", `${NodeTextBGPrefix}${nodedata.Id}`)
        pt.setAttribute("fill", fill)
        pt.setAttribute("stroke", stroke)
        pt.setAttribute("stroke-width", storkewidth.toString());

        let ddata = this.GetPathDAttributeData(0, 0, 80, 40, raduis)
        pt.setAttribute("d", ddata)
        return pt
    }

    /**
     * 根据位置、大小信息，生成svg的path标签的d属性数据
     * @param x x
     * @param y y
     * @param width 宽度
     * @param height 高度
     * @param raduis 圆角半径
     * @returns svg path标签的d属性数据
     */
    private GetPathDAttributeData(x: number, y: number, width: number, height: number, raduis: number) {
        let ddata: string = "M"
        ddata += `${x + raduis},${y}`
        ddata += `h${width - 2 * raduis}`
        ddata += `a${raduis},${raduis},0,0,1,${raduis},${raduis}`
        ddata += `v${height - 2 * raduis}`
        ddata += `a${raduis},${raduis},0,0,1,-${raduis},${raduis}`
        ddata += `h-${width - 2 * raduis}`
        ddata += `a${raduis},${raduis},0,0,1,-${raduis},-${raduis}`
        ddata += `v-${height - 2 * raduis}`
        ddata += `a${raduis},${raduis},0,0,1,${raduis},-${raduis}z`
        return ddata
    }

    /**
     * 节点的文本组标签
     * @param dataid 节点数据ID，方便于后期查找节点
     * @param txt 节点文本
     * @param x x
     * @param y y
     * @param fontsize 字体大小值
     * @param color 字体颜色
     * @returns 整个文本节点组
     */
    private RenderText(dataid: string, txt: string, fontsize: number = 16, color: string = "red"): Element {
        let textgroup = document.createElementNS(this.svgnamespace, "g")
        textgroup.setAttribute("id", `${TextGroupIDPrefix}${dataid}`)
        textgroup.setAttribute("fill", color)
        textgroup.setAttribute("x", "0")
        textgroup.setAttribute("y", "0")

        let textele = document.createElementNS(this.svgnamespace, "text")
        textele.setAttribute("id", `${TextIDPrefix}${dataid}`)
        textele.setAttribute("font-size", `${fontsize}`);
        textele.textContent = txt
        textgroup.appendChild(textele)

        return textgroup
    }
}

/**
 * 整体思路：
 * 1、创建节点
 * 2、调整位置，并记录中心点信息
 * 3、根据中心点信息，绘制连接线
 * 4、整体移动到合适位置去
 */