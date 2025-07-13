"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
const objection_1 = require("objection");
class Session extends objection_1.Model {
    static get tableName() {
        return 'sessions';
    }
    static get idColumn() {
        return 'id';
    }
    static get jsonSchema() {
        return {
            type: 'object',
            required: ['id', 'user_id', 'data', 'expires_at'],
            properties: {
                id: { type: 'string', maxLength: 128 },
                user_id: { type: 'integer' },
                data: { type: 'string' },
                expires_at: { type: 'string', format: 'date-time' },
                created_at: { type: 'string', format: 'date-time' }
            }
        };
    }
    static get relationMappings() {
        // Lazy load to avoid circular dependencies
        const { User } = require('./User');
        return {
            user: {
                relation: objection_1.Model.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: 'sessions.user_id',
                    to: 'users.id'
                }
            }
        };
    }
    $beforeInsert() {
        this.created_at = new Date();
    }
}
exports.Session = Session;
