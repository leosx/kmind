/**
 * 数据格式约束
 */
export interface IDataSchema {

}

/**
 * mind的节点接口
 */
export interface IMindNode {

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
    Data?: Array<IDataSchema>
    ClickItem?: (selectnode: IMindNode) => void
    DragItem?: (selectnode: IMindNode) => void
    KeyBoard?: (arg: KeyboardEvent) => void
    MouseMove?: (arg: MouseEvent) => void
    MouseLeave?: (arg: MouseEvent) => void
    MouseEnter?: (arg: MouseEvent) => void
    ContextMenu?: IContextMenu
}