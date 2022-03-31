export class ExpanderHelper {
    private svgRoot: SVGSVGElement // SVG根节点
    private uid: string
    private buttonGroups: Element // 按钮层，将折叠按钮等操作按钮都放在这里。
    private svgnamespace: string = "http://www.w3.org/2000/svg"
    public expanderPrefix: string
    constructor(root: SVGSVGElement, btng: Element,uid:string) {
        this.svgRoot = root
        this.buttonGroups = btng
        this.uid = uid
        this.expanderPrefix = `${this.uid}_expander_`
    }

    /**
     * 在根svg中指定位置绘制一个折叠按钮。
     * @param tslx translate的x值(相对svg的值)
     * @param tsly translate的Y值(相对svg的值)
     * @param defaultExpand 是否默认展开。
     * @param size 折叠圆圈大小
     */
    public RenderExpander(nodeid: string | number, tslx: number, tsly: number, defaultExpand = false, size: number = 12) {
        const gp = document.createElementNS(this.svgnamespace, "g");
        // gp.setAttribute("id", nodeid);
    }
}
