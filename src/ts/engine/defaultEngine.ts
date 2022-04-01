import * as ifc from "../interfaces"
import { v4 as uuid } from 'uuid';
import { DefaultLinePaiting } from "./defaultLinePaiting"
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
    // 一级节点填充色；所有节点边框色都是他
    private FirstLevelColor: string = "rgb(115, 161, 191)"
    // 所有层级的边框色
    private StorkeColor: string = "rgb(115, 161, 191)"
    // 二级节点填充色
    private SecondLevelColor: string = "rgb(238, 243, 246)"

    // 节点文本组(g)的ID名称前缀
    private TextGroupIDPrefix: string

    // 节点文本背景路径id前缀
    private NodeTextBGPrefix: string

    // 节点文本(text)的ID名称前缀
    private TextIDPrefix: string

    // 节点根分组ID前缀
    private NodeRootPrefix: string

    // 节点左侧子数据区域分组ID前缀
    private NodeLeftZonePrefix: string

    // 节点内容区域分组ID前缀
    private NodeContentZonePrefix: string

    // 节点右侧子数据区域分组ID前缀
    private NodeRightZonePrefix: string

    // 默认连线X轴距离
    private DefaultLineWidth: number = 100

    // 默认同区域两项节点的高度距离
    private DefaultLineHeight: number = 30

    private uid: string
    private rootElement: Element | undefined // 容器根元素
    private svgRoot: SVGSVGElement | undefined // SVG根节点
    private options: ifc.IMindOption // 参数选项
    private grouproot: Element | undefined // 整个绘图分组，用于整体移动、变换等操作
    private renderg: Element | undefined // 渲染节点分组
    private svgnamespace: string = "http://www.w3.org/2000/svg"
    private renderddata: ifc.IMindNode[]
    private buttondown: number = -1 // 指示鼠标按下去时，是左键、中键还是右键
    private mousedownxy: MouseXY = { X: 0, Y: 0 } // 用于平移画布或者移动单个节点时，记录鼠标按下时的初始位置
    private roottraslatexy: MouseXY = { X: 0, Y: 0 } // 用于平移画布时，记录根节点初始translate信息
    private nodetranslatexy: MouseXY = { X: 0, Y: 0 } // 用于移动单个节点时，记录此节点的初始translate信息，以便后续计算使用
    private mouseleftbtndownelement: EventTarget | null; // 用于记录鼠标左键按下时，触发事件的元素是哪个。
    private mouseleftbtndownelementNode: HTMLElement | null; // 用于记录鼠标左键按下时，出发的元素元素的父级思维导图节点是哪个。
    private zindexstartvalue: number;
    private linHleper: DefaultLinePaiting // 画连接线的帮助类，负责连接节点。
    private movingData: ifc.IMindNode | undefined // 正在被移动的节点。通常是一个节点的内容部分。

    constructor(root: Element, svgRoot: SVGSVGElement, options: ifc.IMindOption) {
        this.uid = `k${uuid().slice(3, 8)}`
        this.rootElement = root
        this.svgRoot = svgRoot
        this.options = options
        this.renderddata = []
        this.mouseleftbtndownelement = null;
        this.mouseleftbtndownelementNode = null;
        this.zindexstartvalue = 10000;

        this.TextGroupIDPrefix = `${this.uid}_mind_txtgroupid_`
        this.NodeTextBGPrefix = `${this.uid}_mind_txtbgid_`
        this.TextIDPrefix = `${this.uid}_mind_txtid_`
        this.NodeRootPrefix = `${this.uid}_ndrootg_`
        this.NodeLeftZonePrefix = `${this.uid}_ndleftg_`
        this.NodeContentZonePrefix = `${this.uid}_ndcontentg_`
        this.NodeRightZonePrefix = `${this.uid}_ndrightg_`

        this.linHleper = new DefaultLinePaiting(svgRoot, this.NodeContentZonePrefix, this.uid);
        this.CheckZones()
    }

    /**
     * 用于检查是否有关系组和节点组，没有的话补充
     */
    private CheckZones() {
        if (!this.svgRoot) {
            throw new Error("根节点不为空，请核实")
        }
        let grouproot = this.svgRoot.querySelector(`#${this.uid}_groot`)
        if (grouproot) {
            throw new Error("根节点不为空，请核实")
        }

        if (!this.svgRoot.dataset.uid) {
            this.svgRoot.dataset.uid = this.uid
        }

        this.grouproot = document.createElementNS(this.svgnamespace, "g")
        this.grouproot.setAttribute("id", `${this.uid}_groot`);
        this.svgRoot.onselectstart = () => {
            // 禁止选择功能
            return false
        };
        this.svgRoot.oncontextmenu = (e) => {
            // 禁用根元素的右键菜单，也可以在这里自定义右键菜单。
            e.preventDefault()
        };
        this.svgRoot.addEventListener("mousedown", (e) => {
            this.buttondown = e.buttons

            if (e.buttons == 2) {
                if (!this.grouproot) {
                    return
                }
                this.mousedownxy.X = e.x
                this.mousedownxy.Y = e.y
                this.roottraslatexy.X = 0
                this.roottraslatexy.Y = 0
                let temptranslate = this.GetElementTranslate(this.grouproot)
                if (temptranslate) {
                    this.roottraslatexy = temptranslate
                }
            }
        });
        this.svgRoot.addEventListener("mousemove", this.MoveCanvas.bind(this));
        this.svgRoot.addEventListener("mouseup", async (e: MouseEvent) => {
            this.buttondown = -1
            this.mousedownxy.X = -1
            this.mousedownxy.Y = -1
            this.roottraslatexy.X = 0
            this.roottraslatexy.Y = 0

            // 还需要考虑当移动第二级节点时，从第一级节点的左边移动到右边、或者从第一级节点右边移动到左边，此时需要交换此被移动中的二级节点在第一级节点中的布局位置。为了避免实时交换位置可能引起的性能问题或者卡顿问题，应该在移动停止后进行交换位置并且重绘此二级节点与第一级节点的位置关系级连线关系。
            if (this.movingData && this.mouseleftbtndownelementNode) {
                await this.checkSecondLevelNodeSide(e)
            }
            this.movingData = undefined
        });
        this.svgRoot.addEventListener("mouseenter", this.SvgMouseEntryHandler.bind(this));
        this.svgRoot.appendChild(this.grouproot)

        let renderzone = this.svgRoot.querySelector(`#${this.uid}_render`)
        if (renderzone) {
            throw new Error("根节点不为空，请核实")
        }
        this.renderg = document.createElementNS(this.svgnamespace, "g")
        this.renderg.setAttribute("id", `${this.uid}_render`)
        this.grouproot.appendChild(this.renderg)
    }

    /**
     * 检查二级节点和一级节点位置关系，用于处理二级节点从一级节点左边拖拽到右边、或者从右边拖拽到左边时，方向变化后，需要移动二级节点所在位置级连线关系位置信息。
     */
    private async checkSecondLevelNodeSide(e: MouseEvent) {
        if (!this.movingData || !this.svgRoot)
            return

        // 获取此节点原来是属于第几级的节点。
        const subnodegroupid = `#${this.NodeRootPrefix}${this.movingData.Id}`
        let nodegroup = this.svgRoot.querySelector(subnodegroupid)
        if (!nodegroup)
            return

        // 如果节点不是二级节点，则不需要继续判断了。
        const level = (nodegroup as HTMLElement).dataset.level;
        if (!level)
            return

        const levelnumber = parseInt(level)
        if (levelnumber != 2)
            return

        let parentnodeid = `${this.NodeContentZonePrefix}${this.movingData!.ParentId}` // 父级节点ID。
        if (this.mouseleftbtndownelementNode?.id == parentnodeid)
            return

        const parentCTNode = this.svgRoot.querySelector(`#${parentnodeid}`) // 父级节点的内容节点
        if (!parentCTNode)
            return

        // 先记录删除节点前，鼠标将其移动到的位置信息。
        // 判断当前子节点在父节点中的位置和原来是否一致。
        const subnodeCT = this.svgRoot.querySelector(`#${this.NodeContentZonePrefix}${this.movingData.Id}`)
        if (!subnodeCT)
            return

        const subnodeRect = subnodeCT.getBoundingClientRect()
        const parentCTRect = parentCTNode.getBoundingClientRect()
        // 比较位置关系，看是否左右交换了

        const ctcenterx = parentCTRect.left + (parentCTRect.width / 2)
        let newdirection: string = ""
        let newcontainerid: string = ""
        if (this.movingData.direction == "left") {
            if (subnodeRect.x > ctcenterx) {
                newdirection = "right"
                newcontainerid = `${this.NodeRightZonePrefix}${this.movingData.ParentId}`
            } else {
                return
            }
        } else if (this.movingData.direction == "right") {
            if (subnodeRect.x < ctcenterx) {
                newdirection = "left"
                newcontainerid = `${this.NodeLeftZonePrefix}${this.movingData?.ParentId}`
            } else {
                return
            }
        } else {
            return
        }

        // 被移动节点的内容区域在被删除前所占的位置信息。（表示移动后，内容节点应该所在的位置信息。）
        const oldnodectRect = subnodeCT.getBoundingClientRect()

        // 根据新方向，重新布局及绘制连接线。
        // 删掉原来的节点，重绘整个子节点及下属所有节点，此方式最简单，但是效率不高。
        this.deleteNodeByNodeId(this.movingData.Id.toString())

        // 找到新方向的容器节点。
        const newcontainer = this.svgRoot.querySelector(`#${newcontainerid}`)
        if (!newcontainer)
            return

        const parentdatainfo = this.GetNodeDataByNodeId(this.movingData.ParentId)
        if (!parentdatainfo)
            return

        this.movingData.direction = newdirection
        await this.RenderSingleNode(levelnumber, newcontainer, this.movingData) // 重绘某个节点。
        // 重绘后，新加入的节点默认在最下方，且位置不是鼠标松开手时想要到达的地方，所以还得平移此节点到鼠标松开时，用户想要去的地方。
        // 思路：获取鼠标松开时，内容节点坐标位置；重绘后，将节点平移到此位置上去。
        // 1、计算被拖拽节点内容体的DOMRect信息
        // 2、在新容器中重绘出此节点
        // 3、获取新绘制出的节点的文本节点的DomRect信息
        // 4、计算出新节点整体位置DomRect
        // 5、根据新绘制的文本节点的DomRect和整体DomRect以及偏移量，计算出新绘制的节点整体需要偏移多少。  使用DomRect.x、DomRect.y计算时，需要减去SVG整体偏移量后才是相对偏移量。
        nodegroup = this.svgRoot.querySelector(subnodegroupid)
        if (!nodegroup)
            return
        const newsubnodeGroupRect = nodegroup.getBoundingClientRect()
        // 获取新渲染的文本节点
        const newsubnodeCT = this.svgRoot.querySelector(`#${this.NodeContentZonePrefix}${this.movingData.Id}`)
        if (!newsubnodeCT)
            return
        const newctRect = newsubnodeCT.getBoundingClientRect()
        let relativeX = oldnodectRect.x - newctRect.x
        let relativeY = oldnodectRect.y - newctRect.y

        let contentandrootoffsetx = newsubnodeGroupRect.x - newctRect.x
        let contentandrootoffsety = newsubnodeGroupRect.y - newctRect.y

        relativeX += contentandrootoffsetx
        relativeY += contentandrootoffsety

        let newsubnoeCtTranslate = this.GetElementTranslate(newsubnodeCT)
        if (!newsubnoeCtTranslate) {
            newsubnoeCtTranslate = { X: 0, Y: 0 }
        }

        relativeX += newsubnoeCtTranslate.X
        relativeY += newsubnoeCtTranslate.Y

        nodegroup.setAttribute("transform", `translate( ${relativeX} ${relativeY} )`)

        // 再重新绘制此节点的连线信息。
        this.linHleper.RenderOneNodeLine(this.movingData!, levelnumber, false, parentdatainfo)
    }

    /**
     * 从父级节点中将指定的子节点及其子节点下的所有子节点删掉。
     * @param nodeid 待删除的节点的ID
     */
    private deleteNodeByNodeId(nodeid: string) {
        if (!nodeid || !this.svgRoot)
            return
        const queryselectorid = `#${this.NodeRootPrefix}${nodeid}`
        const deletenode = this.svgRoot.querySelector(queryselectorid)
        if (!deletenode)
            return

        if (!deletenode.parentNode)
            return

        deletenode.parentNode.removeChild(deletenode)
        // 再删掉此节点下的所有连接线。
        const nodedatainfo = this.GetNodeDataByNodeId(nodeid)
        if (!nodedatainfo)
            return

        this.delteAllLinesByNode(nodedatainfo)
    }

    /**
     * 根据节点数据信息删除此节点下的所有子节点的连线信息。
     * @param nodeinfo 节点数据信息
     */
    private delteAllLinesByNode(nodeinfo: ifc.IMindNode) {
        // 先删除此节点和父节点之间的连线。
        if (!nodeinfo.ParentId || nodeinfo.ParentId == "0")
            return

        this.linHleper.DeleteLineByTwoNodeId(nodeinfo.ParentId.toString(), nodeinfo.Id.toString())
        if (!nodeinfo.Childrens)
            return

        for (let index = 0; index < nodeinfo.Childrens.length; index++) {
            const ele = nodeinfo.Childrens[index]
            this.delteAllLinesByNode(ele)
        }
    }

    SvgMouseEntryHandler(e: MouseEvent) {
        if (e.buttons != 1 && e.buttons != 2) {
            this.buttondown = -1;
        }
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

        this.linHleper.RenderLines(data, 1)
    }

    /**
     * 获取节点的平移(translate)信息
     * @param node DOM节点
     * @returns 节点的translate数据信息
     */
    private GetElementTranslate(node: Element): (MouseXY | undefined) {
        let groottranslatestr = node.getAttribute("transform")
        if (groottranslatestr) {
            let translatexyarray = groottranslatestr.replace("translate(", "").replace(")", "").trim().split(" ")
            if (translatexyarray.length == 2) {
                return { X: Number(translatexyarray[0]), Y: Number(translatexyarray[1]) }
            }
        }

        return undefined
    }

    /**
     * 将单个节点渲染到其父级容器上去。
     * @param container 父级容器 
     * @param nodedata 节点数据
     */
    private async RenderSingleNode(level: number, container: Element, nodedata: ifc.IMindNode): Promise<ifc.Result> {
        // 生成节点、同时记录其关系信息
        let gp = document.createElementNS(this.svgnamespace, "g");
        gp.setAttribute("id", `${this.NodeRootPrefix}${nodedata.Id}`);
        (gp as HTMLElement).dataset.level = level.toString();

        let leftg = document.createElementNS(this.svgnamespace, "g");
        leftg.setAttribute("id", `${this.NodeLeftZonePrefix}${nodedata.Id}`);

        let contentg = document.createElementNS(this.svgnamespace, "g");
        contentg.setAttribute("id", `${this.NodeContentZonePrefix}${nodedata.Id}`);

        let rightg = document.createElementNS(this.svgnamespace, "g");
        rightg.setAttribute("id", `${this.NodeRightZonePrefix}${nodedata.Id}`);

        gp.appendChild(leftg)
        gp.appendChild(contentg)
        gp.appendChild(rightg)
        container.appendChild(gp)
        // 绘制文本
        await this.CreateNodeText(contentg, nodedata, (level == 1 ? this.FirstLevelColor : this.SecondLevelColor), this.StorkeColor, (level == 1 ? 40 : 30), 10);

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
                contentg.setAttribute("transform", `translate( ${leftgrect.width + this.DefaultLineWidth} ${centy - centcontenty} )`)
            } else {
                contentg.setAttribute("transform", `translate( 0 ${centy - centcontenty} )`)
            }

            if (leftgrect.width + contentgrect.width > 0) {
                rightg.setAttribute("transform", `translate( ${leftgrect.width + contentgrect.width + (hasleftrect ? this.DefaultLineWidth * 2 : this.DefaultLineWidth)} ${centy - (rightgrect.height / 2)} )`)
            }
        }

        // 注册事件
        (contentg as HTMLElement).addEventListener("dblclick", this.NodeDoubleClick.bind(this));
        (contentg as HTMLElement).addEventListener("mousedown", (e) => {
            this.buttondown = e.buttons
            this.mousedownxy.X = e.x
            this.mousedownxy.Y = e.y
            if (e.buttons == 1) {
                this.mouseleftbtndownelement = e.target
                let targetid = (e.target as Element)?.id
                if (!targetid) {
                    return;
                }

                if (targetid.startsWith(this.NodeRootPrefix)) {
                    this.mouseleftbtndownelementNode = e.target as HTMLElement;
                } else {
                    let splitarrary = targetid.split("_")
                    if (splitarrary.length < 2) {
                        return;
                    }
                    this.mouseleftbtndownelementNode = this.svgRoot?.querySelector(`#${this.NodeRootPrefix}${splitarrary[splitarrary.length - 1]}`) as HTMLElement;
                }

                if (!this.mouseleftbtndownelementNode)
                    return;
                this.mouseleftbtndownelementNode.style.zIndex = this.zindexstartvalue.toString();
                this.zindexstartvalue = this.zindexstartvalue + 1;

                // 记录节点初始状态下的translate信息
                let temptranslate = this.GetElementTranslate(gp)
                if (temptranslate) {
                    this.nodetranslatexy = temptranslate
                } else {
                    this.nodetranslatexy.X = 0
                    this.nodetranslatexy.Y = 0
                }
            }
        });
        (contentg as HTMLElement).addEventListener("mouseup", async (e) => {
            this.buttondown = -1
            this.mousedownxy.X = -1
            this.mousedownxy.Y = -1
            if (this.movingData && this.mouseleftbtndownelementNode) {
                await this.checkSecondLevelNodeSide(e)
            }
            this.movingData = undefined
            this.mouseleftbtndownelement = null
            this.mouseleftbtndownelementNode = null
        });

        // nodedata[""]
    }

    /**
     * 节点双击事件，进入编辑模式
     * @param e 鼠标事件参数
     */
    private NodeDoubleClick(e: MouseEvent) {
        // 双击事件，进入编辑模式
    }

    /**
     * 单个节点左键拖动事件。拖动的是文本内容区域，移动的是整个节点
     * @param e 鼠标事件参数
     * @param movenode 待移动的元素
     * @returns void
     */
    private SingleNodeMove(e: MouseEvent, movenode: Element) {
        if (this.buttondown != 1 || !movenode) {
            return
        }

        let offsetx = e.x - this.mousedownxy.X
        let offsety = e.y - this.mousedownxy.Y
        if (Math.abs(offsetx) < 3 || Math.abs(offsety) < 3) {
            // 移动距离过小则不触发移动
            return
        }

        let oldx = this.nodetranslatexy.X
        let oldy = this.nodetranslatexy.Y
        let newx = oldx + offsetx
        let newy = oldy + offsety
        movenode.setAttribute("transform", `translate( ${newx} ${newy} )`)

        const htmlele = movenode as HTMLElement;
        if (htmlele && htmlele.id) {
            let dataid = htmlele.id.replace(this.NodeRootPrefix, "")

            let temp = undefined
            // 应该缓存数据，当移动的节点和其父级节点没有变化时，直接使用缓存数据，否则每次都去查找一遍，性能太差。
            if (this.movingData) {
                temp = this.movingData
            } else {
                // 找到此节点对应的数据。
                temp = this.GetNodeDataByNodeId(dataid)
                if (!temp) {
                    return
                }

                this.movingData = temp
            }

            let tempparent = undefined
            // 如果此节点本身就是根节点了，那么无须再往上那个找父级节点，此节点就是根节点了。
            if (temp.ParentId && temp.ParentId.toString() != "0") {
                // 找到此节点的父级。
                tempparent = this.GetNodeDataByNodeId(temp.ParentId)
                if (!tempparent) {
                    return
                }
            }

            let datalevel = htmlele.dataset.level;
            if (!datalevel)
                return

            const err = this.linHleper.RenderOneNodeLine(temp, parseInt(datalevel), true, tempparent)
            if (err) {
                console.log(err)
                return
            }
        }
    }

    /**
     * 从已渲染的数据中根据节点ID查找某个节点数据信息。
     * @param nodeid 带查找的节点ID
     * @returns 节点数据
     */
    private GetNodeDataByNodeId(nodeid: string | number): ifc.IMindNode | undefined {
        if (this.renderddata.length <= 0) {
            return undefined
        }

        for (let index = 0; index < this.renderddata.length; index++) {
            const element = this.renderddata[index];
            if (element.Id.toString() == nodeid.toString()) {
                return element
            }

            if (element.Childrens && element.Childrens.length > 0) {
                let temp = this.GetSubNodebyNodeId(element, nodeid)
                if (temp) {
                    return temp
                }
            }
        }

        return undefined
    }

    /**
     * 查找某个节点下的所有子节点是否包含某个ID的子节点。
     * @param parentNode 父级节点
     * @param nodeid 节点ID
     * @returns 节点数据
     */
    private GetSubNodebyNodeId(parentNode: ifc.IMindNode, nodeid: string | number): ifc.IMindNode | undefined {
        if (parentNode.Id.toString() == nodeid.toString()) {
            return parentNode
        }

        if (!parentNode.Childrens) {
            return undefined
        }

        for (let index = 0; index < parentNode.Childrens.length; index++) {
            const element = parentNode.Childrens[index];
            let tempresult = this.GetSubNodebyNodeId(element, nodeid)
            if (tempresult) {
                return tempresult
            }
        }

        return undefined
    }

    /**
     * 平移整个画布
     * @param e 鼠标事件参数e
     */
    private MoveCanvas(e: MouseEvent) {
        if (this.buttondown == 1) {
            // 移动单个节点
            if (!this.mouseleftbtndownelementNode || !this.mouseleftbtndownelement) {
                return
            }
            this.SingleNodeMove(e, this.mouseleftbtndownelementNode);
            return;
        } else if (this.buttondown == 2) {
            // 移动整个画布。
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
            const err = this.linHleper.RenderLines(this.renderddata, 1, true)
            if (err)
                console.error(err)
        }
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
                    startheight += (prenoderect.height + this.DefaultLineHeight)
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
                let txtg = tempsvgroot?.querySelector(`#${that.TextGroupIDPrefix}${nodedata.Id}`)
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
        pt.setAttribute("id", `${this.NodeTextBGPrefix}${nodedata.Id}`)
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
        textgroup.setAttribute("id", `${this.TextGroupIDPrefix}${dataid}`)
        textgroup.setAttribute("fill", color)
        textgroup.setAttribute("x", "0")
        textgroup.setAttribute("y", "0")

        let textele = document.createElementNS(this.svgnamespace, "text")
        textele.setAttribute("id", `${this.TextIDPrefix}${dataid}`)
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