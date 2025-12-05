-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "welcomeChannelId" TEXT,
    "welcomeMessage" TEXT,
    "logChannelId" TEXT,
    "logMessages" BOOLEAN NOT NULL DEFAULT false,
    "logMembers" BOOLEAN NOT NULL DEFAULT false,
    "logModeration" BOOLEAN NOT NULL DEFAULT false,
    "logVoice" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warning" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "moderator" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModLog" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetTag" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "moderatorTag" TEXT NOT NULL,
    "reason" TEXT,
    "duration" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLevel" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "lastXpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelRole" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LevelRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XPSettings" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "xpEnabled" BOOLEAN NOT NULL DEFAULT true,
    "xpMin" INTEGER NOT NULL DEFAULT 15,
    "xpMax" INTEGER NOT NULL DEFAULT 25,
    "xpCooldown" INTEGER NOT NULL DEFAULT 60000,
    "levelUpMessage" BOOLEAN NOT NULL DEFAULT true,
    "ignoredChannels" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XPSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEconomy" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lastDaily" TIMESTAMP(3),
    "lastWork" TIMESTAMP(3),
    "lastRob" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEconomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "roleId" TEXT,
    "emoji" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInventory" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReactionRole" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReactionRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Giveaway" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "prize" TEXT NOT NULL,
    "winners" INTEGER NOT NULL DEFAULT 1,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "ended" BOOLEAN NOT NULL DEFAULT false,
    "winnerIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Giveaway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoMod" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "antiSpamEnabled" BOOLEAN NOT NULL DEFAULT false,
    "antiSpamThreshold" INTEGER NOT NULL DEFAULT 5,
    "antiSpamInterval" INTEGER NOT NULL DEFAULT 5000,
    "antiSpamAction" TEXT NOT NULL DEFAULT 'timeout',
    "antiFloodEnabled" BOOLEAN NOT NULL DEFAULT false,
    "antiFloodThreshold" INTEGER NOT NULL DEFAULT 3,
    "antiFloodAction" TEXT NOT NULL DEFAULT 'delete',
    "antiLinkEnabled" BOOLEAN NOT NULL DEFAULT false,
    "antiLinkAction" TEXT NOT NULL DEFAULT 'delete',
    "allowedLinks" TEXT,
    "badWordsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "badWordsList" TEXT,
    "badWordsAction" TEXT NOT NULL DEFAULT 'delete',
    "ignoredChannels" TEXT,
    "ignoredRoles" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoMod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Starboard" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT,
    "threshold" INTEGER NOT NULL DEFAULT 3,
    "emoji" TEXT NOT NULL DEFAULT '⭐',
    "selfStar" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Starboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarredMessage" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "starboardMsgId" TEXT,
    "authorId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT,
    "attachments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StarredMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT,
    "channelId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Warning_userId_guildId_idx" ON "Warning"("userId", "guildId");

-- CreateIndex
CREATE INDEX "ModLog_guildId_idx" ON "ModLog"("guildId");

-- CreateIndex
CREATE INDEX "ModLog_targetId_idx" ON "ModLog"("targetId");

-- CreateIndex
CREATE INDEX "UserLevel_guildId_xp_idx" ON "UserLevel"("guildId", "xp");

-- CreateIndex
CREATE UNIQUE INDEX "UserLevel_userId_guildId_key" ON "UserLevel"("userId", "guildId");

-- CreateIndex
CREATE INDEX "LevelRole_guildId_idx" ON "LevelRole"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "LevelRole_guildId_level_key" ON "LevelRole"("guildId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "XPSettings_guildId_key" ON "XPSettings"("guildId");

-- CreateIndex
CREATE INDEX "UserEconomy_guildId_balance_idx" ON "UserEconomy"("guildId", "balance");

-- CreateIndex
CREATE UNIQUE INDEX "UserEconomy_userId_guildId_key" ON "UserEconomy"("userId", "guildId");

-- CreateIndex
CREATE INDEX "ShopItem_guildId_idx" ON "ShopItem"("guildId");

-- CreateIndex
CREATE INDEX "UserInventory_userId_guildId_idx" ON "UserInventory"("userId", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInventory_userId_guildId_itemId_key" ON "UserInventory"("userId", "guildId", "itemId");

-- CreateIndex
CREATE INDEX "ReactionRole_guildId_idx" ON "ReactionRole"("guildId");

-- CreateIndex
CREATE INDEX "ReactionRole_messageId_idx" ON "ReactionRole"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "ReactionRole_messageId_emoji_key" ON "ReactionRole"("messageId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "Giveaway_messageId_key" ON "Giveaway"("messageId");

-- CreateIndex
CREATE INDEX "Giveaway_guildId_idx" ON "Giveaway"("guildId");

-- CreateIndex
CREATE INDEX "Giveaway_endsAt_idx" ON "Giveaway"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutoMod_guildId_key" ON "AutoMod"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Starboard_guildId_key" ON "Starboard"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "StarredMessage_messageId_key" ON "StarredMessage"("messageId");

-- CreateIndex
CREATE INDEX "StarredMessage_guildId_idx" ON "StarredMessage"("guildId");

-- CreateIndex
CREATE INDEX "StarredMessage_messageId_idx" ON "StarredMessage"("messageId");

-- CreateIndex
CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId");

-- CreateIndex
CREATE INDEX "Reminder_remindAt_completed_idx" ON "Reminder"("remindAt", "completed");

-- AddForeignKey
ALTER TABLE "Warning" ADD CONSTRAINT "Warning_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModLog" ADD CONSTRAINT "ModLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_userId_guildId_fkey" FOREIGN KEY ("userId", "guildId") REFERENCES "UserEconomy"("userId", "guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarredMessage" ADD CONSTRAINT "StarredMessage_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Starboard"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
