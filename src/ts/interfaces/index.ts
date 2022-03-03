export interface ITag {
    TagName: string
    TagID: number
    Img?: string
}

/**
 * mind的节点接口，表示数据格式
 */
export interface IMindNode {
    [key: string]: any
    // 数据ID，方便以后查找
    Id: string | number
    // 父级ID，方便后续查找
    ParentId: string | number
    // 显示名称
    Name: string
    // 直接点数组
    Childrens?: Array<IMindNode>
    // 备注信息
    Remark?: string
    // 标签信息
    Tags?: Array<ITag>
}

/**
 * 右键菜单上下文
 */
export interface IContextMenu {

}

/**
 * mind初始化参数
 */
export interface IMindOption {
    width?: string
    height?: string
    Data?: Array<IMindNode>
    ClickItem?: (selectnode: IMindNode) => void
    DragItem?: (selectnode: IMindNode) => void
    KeyBoard?: (arg: KeyboardEvent) => void
    MouseMove?: (arg: MouseEvent) => void
    MouseLeave?: (arg: MouseEvent) => void
    MouseEnter?: (arg: MouseEvent) => void
    ContextMenu?: IContextMenu
}

export type Result = Error | undefined | void

export interface IEngine {
    /**
     * 渲染样式
     */
    RenderStyle(): Result
    /**
     * 将数据渲染成mind节点
     * @param data 待渲染的数据
     */
    RenderBody(data: Array<IMindNode>): Promise<Result>
}