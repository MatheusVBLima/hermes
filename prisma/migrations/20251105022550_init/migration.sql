-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "welcomeChannelId" TEXT,
    "welcomeMessage" TEXT,
    "logChannelId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Warning" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "moderator" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Warning_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetTag" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "moderatorTag" TEXT NOT NULL,
    "reason" TEXT,
    "duration" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserLevel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "lastXpAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserEconomy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lastDaily" DATETIME,
    "lastWork" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
CREATE INDEX "UserEconomy_guildId_balance_idx" ON "UserEconomy"("guildId", "balance");

-- CreateIndex
CREATE UNIQUE INDEX "UserEconomy_userId_guildId_key" ON "UserEconomy"("userId", "guildId");
