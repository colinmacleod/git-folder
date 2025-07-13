import { Model } from 'objection';

export class FolderPermission extends Model {
  static get tableName() {
    return 'folder_permissions';
  }

  id!: number;
  shared_folder_id!: number;
  user_id!: number;
  permission_level!: 'viewer' | 'contributor' | 'admin';
  granted_by!: number;
  created_at!: Date;

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
        relation: Model.BelongsToOneRelation,
        modelClass: SharedFolder,
        join: {
          from: 'folder_permissions.shared_folder_id',
          to: 'shared_folders.id'
        }
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'folder_permissions.user_id',
          to: 'users.id'
        }
      },
      grantedByUser: {
        relation: Model.BelongsToOneRelation,
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