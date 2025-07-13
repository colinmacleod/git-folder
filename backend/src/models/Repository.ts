import { Model } from 'objection';

export class Repository extends Model {
  static get tableName() {
    return 'repositories';
  }

  id!: number;
  name!: string;
  description?: string;
  git_url!: string;
  local_path?: string;
  owner_id!: number;
  is_active!: boolean;
  created_at!: Date;
  updated_at!: Date;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'git_url', 'owner_id'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', maxLength: 255 },
        description: { type: 'string' },
        git_url: { type: 'string', maxLength: 500 },
        local_path: { type: 'string', maxLength: 500 },
        owner_id: { type: 'integer' },
        is_active: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const User = require('./User').User;
    const SharedFolder = require('./SharedFolder').SharedFolder;

    return {
      owner: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'repositories.owner_id',
          to: 'users.id'
        }
      },
      sharedFolders: {
        relation: Model.HasManyRelation,
        modelClass: SharedFolder,
        join: {
          from: 'repositories.id',
          to: 'shared_folders.repository_id'
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