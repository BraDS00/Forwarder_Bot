const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'targets.json');

function ensureStorage() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify({ groups: [], users: [] }, null, 2)
        );
    }
}

function loadTargets() {
    ensureStorage();

    return JSON.parse(
        fs.readFileSync(DATA_FILE, 'utf8')
    );
}

function saveTargets(targets) {
    ensureStorage();

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(targets, null, 2)
    );
}

function addGroup(chat) {
    const targets = loadTargets();

    const exists = targets.groups.some(
        group => group.id === chat.id
    );

    if (!exists) {
        targets.groups.push({
            id: chat.id,
            title: chat.title,
            type: chat.type
        });

        saveTargets(targets);
    }
}

function removeGroup(chatId) {
    const targets = loadTargets();

    targets.groups = targets.groups.filter(
        group => group.id !== chatId
    );

    saveTargets(targets);
}

function getGroups() {
    return loadTargets().groups;
}

function addUser(user) {
    const targets = loadTargets();

    const exists = targets.users.some(
        existing => existing.id === user.id
    );

    if (!exists) {
        targets.users.push({
            id: user.id,
            username: user.username || null,
            firstName: user.first_name || null
        });

        saveTargets(targets);
    }
}

function getUsers() {
    return loadTargets().users;
}

module.exports = {
    loadTargets,
    saveTargets,
    addGroup,
    removeGroup,
    getGroups,
    addUser,
    getUsers
};