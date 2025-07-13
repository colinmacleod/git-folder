"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileOperation = void 0;
const objection_1 = require("objection");
class FileOperation extends objection_1.Model {
    static get tableName() {
        return 'file_operations';
    }
    static get jsonSchema() {
        return {
            type: 'object',
            required: ['shared_folder_id', 'operation_type', 'file_path'],
            properties: {
                id: { type: 'integer' },
                shared_folder_id: { type: 'integer' },
                user_id: { type: ['integer', 'null'] },
                operation_type: {
                    type: 'string',
                    enum: ['upload', 'download', 'delete', 'rename'],
                    maxLength: 20
                },
                file_path: { type: 'string', maxLength: 500 },
                file_size: { type: ['integer', 'null'] },
                commit_hash: { type: ['string', 'null'], maxLength: 64 },
                commit_message: { type: ['string', 'null'] },
                ip_address: { type: ['string', 'null'], maxLength: 45 },
                user_agent: { type: ['string', 'null'] },
                created_at: { type: 'string', format: 'date-time' }
            }
        };
    }
    static get relationMappings() {
        // Lazy load to avoid circular dependencies
        const { SharedFolder } = require('./SharedFolder');
        const { User } = require('./User');
        return {
            sharedFolder: {
                relation: objection_1.Model.BelongsToOneRelation,
                modelClass: SharedFolder,
                join: {
                    from: 'file_operations.shared_folder_id',
                    to: 'shared_folders.id'
                }
            },
            user: {
                relation: objection_1.Model.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: 'file_operations.user_id',
                    to: 'users.id'
                }
            }
        };
    }
    $beforeInsert() {
        this.created_at = new Date();
    }
}
exports.FileOperation = FileOperation;
