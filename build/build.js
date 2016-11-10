/*!***************************************************
 * diacritics
 * http://diacritics.io/
 * Copyright (c) 2016, Julian Motz
 * Released under the MIT license https://git.io/vXg2H
 *****************************************************/
"use strict";
const fs = require("fs"), // file system
    glob = require("glob"), // match files using patterns
    del = require("del"), // delete files using patterns
    stripJsonComments = require("strip-json-comments"), // remove JSON comments
    Ajv = require("ajv"); // json schema validation

class Build {

    /**
     * Constructor
     */
    constructor() {
        this.run();
    }

    /**
     * Language file schema
     * @type {object}
     */
    get languageFileSchema() {
        if(!this._languageFileSchema) {
            this._languageFileSchema = this.readJSON("./build/schema.js");
        }
        return this._languageFileSchema;
    }

    /**
     * HTML entities
     * @type {object}
     */
    get htmlEntities() {
        if(!this._htmlEntities) {
            this._htmlEntities = this.readJSON("./build/html-entities.js");
        }
        return this._htmlEntities;
    }

    /**
     * Package information
     * @type {object}
     */
    get pkg() {
        if(!this._pkg) {
            this._pkg = this.readJSON("./package.json");
        }
        return this._pkg;
    }

    /**
     * Reads a JSON file, removes comments and parses it
     * @return {object}
     */
    readJSON(file) {
        return JSON.parse(
            stripJsonComments(
                fs.readFileSync(file, "utf8")
            )
        );
    }

    /**
     * Removes all files of the build output folder
     */
    clearBuild() {
        del.sync(["./build/out/**"]);
    }

    /**
     * Returns an array of all language files
     * @return {object[]}
     */
    getLanguageFiles() {
        let ret = [];
        glob.sync("./src/**/*.js").forEach(file => {
            const spl = file.split("/"),
                folderName = spl[2],
                fileName = spl[3].split(".")[0];
            ret.push({
                file,
                folderName,
                fileName
            });
        });
        return ret;
    }

    /**
     * Validates JSON syntax
     * @param {string} file - Path to the JSON file
     * @return {boolean}
     */
    validateJSONSyntax(file) {
        try {
            this.readJSON(file);
            return true;
        } catch(error) {
            return false;
        }
    }

    /**
     * Validates JSON schema
     * @param {string} file - Path to the JSON file
     * @return {string] - Either an empty string or the error message
     */
    validateJSONSchema(file) {
        const validator = new Ajv(),
            validate = validator.compile(this.languageFileSchema);
        if(!validate(this.readJSON(file))) {
            return JSON.stringify(validate.errors, null, 4);
        } else {
            return "";
        }
    }

    /**
     * Writes the defined content into ./build/out/[version]/diacritics.json
     * @param {string} content - The file content
     */
    writeOutput(content) {
        // write diacritics.json based on `out`
        fs.mkdirSync("./build/out/");
        fs.mkdirSync(`./build/out/v${this.pkg.version.split(".")[0]}`);
        fs.writeFileSync(
            `./build/out/v${this.pkg.version.split(".")[0]}/diacritics.json`,
            JSON.stringify(content, null, 4),
            "utf8"
        );
    }

    /**
     * Runs the build
     */
    run() {
        this.clearBuild();
        let out = {};
        this.getLanguageFiles().forEach(item => {
            const {
                file,
                folderName,
                fileName
            } = item;

            if(!this.validateJSONSyntax(file)) {
                throw new Error(`Syntax error in file: '${file}'`);
            }
            let schemaValidation = this.validateJSONSchema(file);
            if(schemaValidation.length > 0) {
                throw new Error(
                    `Schema error in file '${file}': ${schemaValidation}`
                );
            }

            if(folderName === fileName) { // no language variant
                out[fileName] = this.readJSON(file);
            } else {
                if(typeof out[folderName] === "undefined") {
                    out[folderName] = {};
                }
                out[folderName][fileName] = this.readJSON(file);
            }
        });
        this.writeOutput(out);
    }

}

// run the build
new Build();
