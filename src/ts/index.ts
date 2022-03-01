import * as SXMind from "./sxmind"

console.log("sxmind")

let mind = new SXMind.default("div#root", {
    width: "100%",
    height: "100%",
    Data: [{
        Id: "1",
        ParentId: "0",
        Name: "test"
    }]
})