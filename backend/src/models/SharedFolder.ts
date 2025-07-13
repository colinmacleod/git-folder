import { Model } from 'objection';

export class SharedFolder extends Model {
  static get tableName() {
    return 'shared_folders';
  }

  id!: number;
  repository_id!: number;
  folder_path!: string;
  name!: string;
  description?: string;
  is_public!: boolean;
  public_token?: string;
  commit_message_required!: boolean;
  created_at!: Date;
  updated_at!: Date;

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
    const Repository = require('./Repository').Repository;
    const FolderPermission = require('./FolderPermission').FolderPermission;
    const FileOperation = require('./FileOperation').FileOperation;

    return {
      repository: {
        relation: Model.BelongsToOneRelation,
        modelClass: Repository,
        join: {
          from: 'shared_folders.repository_id',
          to: 'repositories.id'
        }
      },
      permissions: {
        relation: Model.HasManyRelation,
        modelClass: FolderPermission,
        join: {
          from: 'shared_folders.id',
          to: 'folder_permissions.shared_folder_id'
        }
      },
      fileOperations: {
        relation: Model.HasManyRelation,
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