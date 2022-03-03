import * as SXMind from "./sxmind"

console.log("sxmind")

let mind = new SXMind.default("div#root", {
    width: "100%",
    height: "100%",
    Data: [{
        Id: "1",
        ParentId: "0",
        Name: "中华人民共和国国徽",
        Childrens: [
            {
                Id: "1-1",
                ParentId: "1",
                Name: "效率源科技",
                Childrens: [{
                    Id: "1-1-1",
                    ParentId: "1-1",
                    Name: "电子数据项目组"
                }, {
                    Id: "1-1-2",
                    ParentId: "1-1",
                    Name: "大数据项目组"
                }, {
                    Id: "1-1-3",
                    ParentId: "1-1",
                    Name: "数据安全组"
                }, {
                    Id: "1-1-4",
                    ParentId: "1-1",
                    Name: "智能终端组"
                }]
            }, {
                Id: "1-2",
                ParentId: "1",
                Name: "密无痕"
            }, {
                Id: "1-3",
                ParentId: "1",
                Name: "艾特银泰"
            }
        ]
    }, {
        Id: "2",
        ParentId: "0",
        Name: "计算机取证系统"
    }]
})