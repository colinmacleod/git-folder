import { Model } from 'objection';

export class User extends Model {
  static get tableName() {
    return 'users';
  }

  id!: number;
  oauth_provider!: string;
  oauth_id!: string;
  email!: string;
  username!: string;
  display_name?: string;
  avatar_url?: string;
  ssh_private_key?: string;
  ssh_public_key?: string;
  created_at!: Date;
  updated_at!: Date;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['oauth_provider', 'oauth_id', 'email', 'username'],
      properties: {
        id: { type: 'integer' },
        oauth_provider: { type: 'string', maxLength: 20 },
        oauth_id: { type: 'string', maxLength: 100 },
        email: { type: 'string', maxLength: 255 },
        username: { type: 'string', maxLength: 100 },
        display_name: { type: 'string', maxLength: 255 },
        avatar_url: { type: 'string', maxLength: 500 },
        ssh_private_key: { type: 'string' },
        ssh_public_key: { type: 'string' },
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
    const { Session } = require('./Session');

    return {
      repositories: {
        relation: Model.HasManyRelation,
        modelClass: Repository,
        join: {
          from: 'users.id',
          to: 'repositories.owner_id'
        }
      },
      folderPermissions: {
        relation: Model.HasManyRelation,
        modelClass: FolderPermission,
        join: {
          from: 'users.id',
          to: 'folder_permissions.user_id'
        }
      },
      fileOperations: {
        relation: Model.HasManyRelation,
        modelClass: FileOperation,
        join: {
          from: 'users.id',
          to: 'file_operations.user_id'
        }
      },
      sessions: {
        relation: Model.HasManyRelation,
        modelClass: Session,
        join: {
          from: 'users.id',
          to: 'sessions.user_id'
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