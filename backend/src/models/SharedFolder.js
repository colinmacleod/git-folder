"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedFolder = void 0;
const objection_1 = require("objection");
class SharedFolder extends objection_1.Model {
    static get tableName() {
        return 'shared_folders';
    }
    static get jsonSchema() {
        return {
            type: 'object',
            required: ['repository_id', 'folder_path', 'name'],
            properties: {
                id: { type: 'integer' },
                repository_id: { type: 'integer' },
                folder_path: { type: 'string', maxLength: 500 },
                name: { type: 'string', maxLength: 255 },
                description: { type: 'string' },
                is_public: { type: 'boolean' },
                public_token: { type: 'string', maxLength: 64 },
                commit_message_required: { type: 'boolean' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
            }
        };
    }
    static get relationMappings() {
        // Lazy load to avoid circular dependencies
        const { Repository } = require('./Repository');
        const { FolderPermission } = require('./FolderPermission');
        const { FileOperation } = require('./FileOperation');
        return {
            repository: {
                relation: objection_1.Model.BelongsToOneRelation,
                modelClass: Repository,
                join: {
                    from: 'shared_folders.repository_id',
                    to: 'repositories.id'
                }
            },
            permissions: {
                relation: objection_1.Model.HasManyRelation,
                modelClass: FolderPermission,
                join: {
                    from: 'shared_folders.id',
                    to: 'folder_permissions.shared_folder_id'
                }
            },
            fileOperations: {
                relation: objection_1.Model.HasManyRelation,
                modelClass: FileOperation,
                join: {
                    from: 'shared_folders.id',
                    to: 'file_operations.shared_folder_id'
                }
            }
        };
    }
    $beforeInsert() {
        this.created_at = new Date();
        this.updated_at = new Date();
    }
    $beforeUpdate() {
        this.updated_at = new Date();
    }
}
exports.SharedFolder = SharedFolder;
