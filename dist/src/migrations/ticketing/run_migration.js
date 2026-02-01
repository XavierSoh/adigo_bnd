"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pgdb_1 = __importDefault(require("../../config/pgdb"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function runMigration() {
    console.log('🚀 Starting Ticketing Module Migration...\n');
    const migrations = [
        '001_create_tables.sql',
        '002_seed_categories.sql',
        '003_add_admin_tables.sql'
    ];
    for (const file of migrations) {
        const filePath = path.join(__dirname, file);
        console.log(`📄 Running: ${file}`);
        try {
            const sql = fs.readFileSync(filePath, 'utf8');
            await pgdb_1.default.none(sql);
            console.log(`   ✅ Success\n`);
        }
        catch (error) {
            console.error(`   ❌ Error: ${error.message}\n`);
        }
    }
    // Verify tables
    console.log('🔍 Verifying tables...');
    const tables = await pgdb_1.default.any("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'event%' ORDER BY table_name");
    console.log('   Tables created:', tables.map((t) => t.table_name).join(', '));
    // Verify categories
    const categories = await pgdb_1.default.one('SELECT COUNT(*) as count FROM event_category');
    console.log(`   Categories seeded: ${categories.count}`);
    console.log('\n✅ Migration completed!');
    process.exit(0);
}
runMigration().catch(e => {
    console.error('💥 Migration failed:', e);
    process.exit(1);
});
