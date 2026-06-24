import { world, system, CommandPermissionLevel, CustomCommandStatus, Player, PlayerPermissionLevel, CustomCommandParamType } from "@minecraft/server";
import { CONFIG } from "./config.js";

function hasPermission(player, permissions) {
    if (!permissions) return true;

    const playerTagsLower = player.getTags().map(t => t.toLowerCase());

    const tags = permissions.tags || [];
    const requiresOp = permissions.requiresOp !== undefined ? permissions.requiresOp : false;
    const matchType = permissions.matchType || "AND";

    const isOp = (player.playerPermissionLevel === PlayerPermissionLevel.Operator) || 
                 (player.playerPermissionLevel === 2) || 
                 (typeof player.isOp === "function" && player.isOp());

    if (isOp) return true;

    let hasMatchingTag = true;
    if (tags.length > 0) {
        hasMatchingTag = tags.some(tag => playerTagsLower.includes(tag.toLowerCase()));
    }

    if (matchType === "OR") {
        const opCheck = requiresOp && isOp;
        const tagCheck = tags.length > 0 && hasMatchingTag;
        return opCheck || tagCheck || (!requiresOp && tags.length === 0);
    } else {
        const opCheck = requiresOp ? isOp : true;
        const tagCheck = tags.length > 0 ? hasMatchingTag : true;
        return opCheck && tagCheck;
    }
}

function getTargetPlayers(executor, targetStr) {
    const allPlayers = world.getAllPlayers();

    if (!targetStr || targetStr === "@s") {
        return [executor];
    }

    const targetLower = targetStr.toLowerCase();

    if (targetLower === "all" || targetLower === "@a") {
        return allPlayers;
    }

    const cleanName = targetStr.replace(/^["']|["']$/g, "").toLowerCase();
    const matchedPlayer = allPlayers.find(p => p.name.toLowerCase() === cleanName);
    if (matchedPlayer) {
        return [matchedPlayer];
    }

    return [];
}

system.beforeEvents.startup.subscribe((init) => {
    const registry = init.customCommandRegistry;
    if (!registry) {
        console.error("[CustomCommand] customCommandRegistry tidak ditemukan pada event startup!");
        return;
    }

    const namespace = CONFIG.NAMESPACE || "custom";

    for (const cmdConfig of CONFIG.COMMANDS) {
        if (!cmdConfig.name) continue;

        const commandName = `${namespace}:${cmdConfig.name.toLowerCase()}`;

        const commandDefinition = {
            name: commandName,
            description: `Menjalankan pintasan perintah kustom: /${cmdConfig.name}`,
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
            optionalParameters: [
                {
                    name: "target",
                    type: CustomCommandParamType.String
                }
            ]
        };

        registry.registerCommand(commandDefinition, (origin, target) => {
            const player = origin?.initiator || origin.sourceEntity;

            if (!(player instanceof Player)) {
                return {
                    status: CustomCommandStatus.Failure,
                    message: "Perintah ini hanya dapat dijalankan oleh Player."
                };
            }

            if (!hasPermission(player, cmdConfig.permissions)) {
                return {
                    status: CustomCommandStatus.Failure,
                    message: `§cIncorrect permission level for command: ${cmdConfig.name}.§r`
                };
            }

            const targetPlayers = getTargetPlayers(player, target);
            if (targetPlayers.length === 0) {
                return {
                    status: CustomCommandStatus.Failure,
                    message: `§cNo targets matched selector§r`
                };
            }

            const blacklistTags = cmdConfig.permissions.blacklistTags || [];
            let eligibleTargets = targetPlayers;
            if (blacklistTags.length > 0) {
                eligibleTargets = targetPlayers.filter(p => {
                    const pTagsLower = p.getTags().map(t => t.toLowerCase());
                    return !blacklistTags.some(t => pTagsLower.includes(t.toLowerCase()));
                });
                
                if (eligibleTargets.length === 0) {
                    return {
                        status: CustomCommandStatus.Failure,
                        message: `§cTarget does not meet requirements§r`
                    };
                }
            }

            system.run(() => {
                const overworld = world.getDimension("overworld");

                for (const targetPlayer of eligibleTargets) {
                    if (targetPlayer.isValid === false) continue;

                    const tempTag = `cc_temp_${Math.floor(Math.random() * 1000000)}`;
                    try {
                        targetPlayer.addTag(tempTag);
                    } catch (tagError) {
                        console.warn(`[CustomCommand] Gagal menambahkan tag sementara: ${tagError}`);
                    }

                    for (let cmd of cmdConfig.commands) {
                        if (cmd.startsWith("/")) {
                            cmd = cmd.substring(1);
                        }

                        const finalCmd = cmd.replace(/\{target\}|\(target\)|\{selector\}|\(selector\)/g, `@a[tag=${tempTag}]`);

                        try {
                            overworld.runCommand(`execute as @a[tag=${tempTag}] at @s run ${finalCmd}`);
                        } catch (error) {
                            player.sendMessage(`§cGagal menjalankan sub-command: "${finalCmd}". Error: ${error}`);
                            console.warn(`[CustomCommand] Gagal menjalankan sub-command: "${finalCmd}" untuk ${targetPlayer.name}. Error: ${error}`);
                        }
                    }

                    try {
                        if (targetPlayer.isValid !== false) {
                            targetPlayer.removeTag(tempTag);
                        }
                    } catch (tagError) {
                        console.warn(`[CustomCommand] Gagal menghapus tag sementara: ${tagError}`);
                    }
                }
            });

            return { status: CustomCommandStatus.Success };
        });

        console.log(`[CustomCommand] Berhasil mendaftarkan: /${commandName} (bisa dipanggil juga sebagai /${cmdConfig.name})`);
    }
});
