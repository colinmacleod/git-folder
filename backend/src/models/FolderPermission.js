"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FolderPermission = void 0;
const objection_1 = require("objection");
class FolderPermission extends objection_1.Model {
    static get tableName() {
        return 'folder_permissions';
    }
    static get jsonSchema() {
        return {
            type: 'object',
            required: ['shared_folder_id', 'user_id', 'permission_level', 'granted_by'],
            properties: {
                id: { type: 'integer' },
                shared_folder_id: { type: 'integer' },
                user_id: { type: 'integer' },
                permission_level: {
                    type: 'string',
                    enum: ['viewer', 'contributor', 'admin'],
                    maxLength: 20
                },
                granted_by: { type: 'integer' },
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
                    from: 'folder_permissions.shared_folder_id',
                    to: 'shared_folders.id'
                }
            },
            user: {
                relation: objection_1.Model.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: 'folder_permissions.user_id',
                    to: 'users.id'
                }
            },
            grantedByUser: {
                relation: objection_1.Model.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: 'folder_permissions.granted_by',
                    to: 'users.id'
                }
            }
        };
    }
    $beforeInsert() {
        this.created_at = new Date();
    }
}
exports.FolderPermission = FolderPermission;
