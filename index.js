const { prompt, registerPrompt } = require('inquirer');
registerPrompt('directory', require('inquirer-select-directory'));
const { parse, join } = require('path');
const initializers = {
    enmap: (name, dataDir) => {
        const Enmap = require('enmap');
        let db = new Enmap({
            name,
            dataDir
        });
        return {
            size: db.count,
            defer: db.defer,
            export: db.export,
            import: db.import,
            close: db.close
        };
    },
    josh: (name, dataDir) => {
        const Josh = require('josh');
        const provider = require('@josh-providers/sqlite');
        let db = new Josh({
            name,
            providerOptions: { dataDir },
            provider
        });
        return {
            size: db.size,
            defer: db.defer,
            export: db.export,
            import: db.import,
            close: db.close
        };
    }
};
(async () => {
    let answers = await prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Which action do you want to do?',
            choices: [
                {
                    name: 'Enmap to Josh',
                    value: ['enmap', 'josh'],
                    short: 'Enmap-Josh'
                },
                {
                    name: 'Josh to Enmap',
                    value: ['josh', 'enmap'],
                    short: 'Josh-Enmap'
                },
                {
                    name: 'Enmap to another Enmap',
                    value: ['enmap', 'enmap'],
                    short: 'Enmap-Enmap'
                },
                {
                    name: 'Josh to another Josh',
                    value: ['josh', 'josh'],
                    short: 'Josh-Josh'
                },
            ]
        },
        {
            type: 'directory',
            message: (a) => `Where is the data directory for your ${a.action[0]}?`,
            name: 'firstPath',
            basePath: process.cwd()
        },
        {
            type: 'confirm',
            message: 'I have noticed the folder you choose isn\'t called "data".\nBy default Enmap/Josh store files in a data folder.\nWould you like me to append "data" to it?',
            name: 'firstPathAddData',
            when: (a) => parse(a.firstPath).base !== 'data'
        },
        {
            type: 'confirm',
            message: (a) => `Will your ${a.action[1]} use the same path as your ${a.action[0]}?`,
            name: 'samePath'
        },
        {
            type: 'directory',
            message: (a) => `Where is the data directory for your ${a.action[1]}?`,
            name: 'secondPath',
            basePath: process.cwd(),
            when: (a) => !a.samePath
        },
        {
            type: 'confirm',
            message: 'I have noticed the folder you choose isn\'t called "data".\nBy default Enmap/Josh store files in a data folder.\nWould you like me to append "data" to it?',
            name: 'secondPathAddData',
            when: (a) => a.secondPath && parse(a.secondPath).base !== 'data'
        },
        {
            type: 'input',
            message: (a) => `What is the name for your ${a.action[0]}?`,
            name: 'firstName',
        },
        {
            type: 'confirm',
            message: (a) => `Will your ${a.action[1]} use the same name as your ${a.action[0]}?`,
            name: 'sameName'
        },
        {
            type: 'input',
            message: (a) => `What is the name for your ${a.action[1]}?`,
            name: 'secondName',
            basePath: process.cwd(),
            when: (a) => !a.sameName
        },
    ]);
    console.log(answers);
    let { action, firstPath, secondPath, samePath, firstName, secondName, sameName, firstPathAddData, secondPathAddData } = answers;
    if (firstPathAddData) firstPath = join(firstPath, 'data');
    if (samePath) secondPath = firstPath;
    if (secondPathAddData) secondPath = join(secondPath, 'data');
    if (sameName) secondName = firstName;
    let oldDB = initializers[action[0]](firstName, firstPath);
    let newDB = initializers[action[1]](secondName, secondPath);
    await oldDB.defer;
    await newDB.defer;
    if (await newDB.size) {
        if (!(await prompt([{ type: 'confirm', name: 'continue', message: `The ${action[1]} has ${await newDB.size} key(s). Continuing might lose data.\nAre you sure you want to continue?` }])).continue) return console.log('Canceled');
    }
    console.log(`Moving ${await oldDB.size} entries from ${action[0]} to ${action[1]}.\nPlease wait...`);
    await newDB.import(await oldDB.export());
    console.log(`Done!
${action[1]} now has ${await newDB.size}`);
    await newDB.close();
    await oldDB.close();
})();