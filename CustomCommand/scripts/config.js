export const CONFIG = {

    NAMESPACE: "custom",

    COMMANDS: [
        {
            name: "customcommand",
            permissions: {
                tags: [""], 
                blacklistTags: [],
                requiresOp: true,
                matchType: "AND"
            },
            commands: [
                "title (selector) actionbar CUSTOM COMMAND ACTIVE"
            ]
        },
        {
            name: "starterpack",
            permissions: {
                tags: [""], 
                blacklistTags: ["starterpack"],
                requiresOp: false,
                matchType: "OR"
            },
            commands: [
                "tag (selector) add starterpack",
                "give (selector) wooden_sword",
                "give (selector) wooden_pickaxe",
                "give (selector) bread 16",
                "title (selector actionbar SUCCESS CLAIM STARTERPACK)"
            ]
        },
        {
            name: "addvip",
            permissions: {
                tags: [""], 
                blacklistTags: ["vip"],
                requiresOp: true,
                matchType: "AND"
            },
            commands: [
                "tag (selector) add vip",
                "give (selector) diamond_sword",
                "give (selector) diamond_pickaxe",
                "give (selector) golden_apple 16",
                "title (selector actionbar SUCCESS CLAIM VIP)"
            ]
        }
    ]
};
