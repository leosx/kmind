export class DomHelper {
    constructor() {

    }

    /**
     * 在指定节点上查找指定标签名称的父级节点(最近的第一符合的父级节点)
     * @param node 子级节点，在此基础上查找父级节点
     * @param tagname 父级标签类型
     * @returns 父级节点
     */
    static FindParentByTagName(node: Element, tagname: string): Element | null {
        if (!tagname) {
            return null
        }

        const currentNode = node as HTMLElement
        if (!currentNode)
            return null

        if (currentNode.tagName.toLowerCase() == tagname.toLowerCase())
            return node

        if (!node.parentNode)
            return null

        const parentnode = node.parentNode as HTMLElement
        if (!parentnode)
            return null

        if (parentnode.tagName.toLowerCase() == tagname.toLowerCase())
            return parentnode

        if (!parentnode.parentNode)
            return null

        return DomHelper.FindParentByTagName(parentnode.parentNode as Element, tagname)
    }
}