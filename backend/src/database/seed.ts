/**
 * LOS Database Seeder
 * Run: npx ts-node src/database/seed.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  Customer, LoanApplication, Product, User, Role,
  ApprovalWorkflow, ApprovalMatrix, ApprovalCriteria,
  Question, QuestionCategory, QuestionOption,
  FormTemplate, FormQuestion, Answer,
  ScoringModel, ScoringRule, ApplicationScore,
  UserDelegation, Blacklist, Notification, AuditLog,
} from './entities';

const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://los_user:los_password@localhost:5432/los_db',
  entities: [
    Customer, LoanApplication, Product, User, Role,
    ApprovalWorkflow, ApprovalMatrix, ApprovalCriteria,
    Question, QuestionCategory, QuestionOption,
    FormTemplate, FormQuestion, Answer,
    ScoringModel, ScoringRule, ApplicationScore,
    UserDelegation, Blacklist, Notification, AuditLog,
  ],
  synchronize: true,
  logging: false,
});

function hash(v: string) { return crypto.createHash('sha256').update(v.toLowerCase().trim()).digest('hex'); }
function maskEmail(e: string) { const [l, d] = e.split('@'); return `${l[0]}***@${d}`; }

async function seed() {
  await ds.initialize();
  console.log('🌱 Seeding LOS database...');

  // ── 1. Roles ─────────────────────────────────────────────────────────────
  const roleRepo = ds.getRepository(Role);
  const roleData = [
    { name: 'SALE',                  permissions: ['application:create', 'questionnaire:fill'] },
    { name: 'CREDIT_OFFICER',        permissions: ['application:approve:L1'] },
    { name: 'SENIOR_CREDIT_OFFICER', permissions: ['application:approve:L2'] },
    { name: 'CREDIT_SUPERVISOR',     permissions: ['application:approve:L3'] },
    { name: 'CREDIT_MANAGER',        permissions: ['application:approve:L4'] },
    { name: 'CREDIT_DIRECTOR',       permissions: ['application:approve:L5', 'reports:view'] },
    { name: 'VP_CREDIT',             permissions: ['application:approve:L6', 'reports:view'] },
    { name: 'CREDIT_COMMITTEE',      permissions: ['application:approve:L7'] },
    { name: 'ADMIN',                 permissions: ['*'] },
    { name: 'AUDIT',                 permissions: ['audit:read', 'reports:view'] },
  ];
  const roles: Record<string, Role> = {};
  for (const r of roleData) {
    let role = await roleRepo.findOne({ where: { name: r.name } });
    if (!role) {
      role = roleRepo.create({ ...r, createdBy: 'seed' });
      role = await roleRepo.save(role);
    }
    roles[r.name] = role;
  }
  console.log('  ✓ Roles seeded');

  // ── 2. Users ─────────────────────────────────────────────────────────────
  const userRepo = ds.getRepository(User);
  const BCRYPT_ROUNDS = 10;
  const usersData = [
    { username: 'admin',   password: 'Admin@1234!',   nameTh: 'ผู้ดูแลระบบ',      role: 'ADMIN',                  level: null, email: 'admin@los.local' },
    { username: 'sale01',  password: 'Sale@1234!',    nameTh: 'นายสมชาย ขาย',      role: 'SALE',                   level: null, email: 'sale01@los.local' },
    { username: 'lo01',    password: 'Credit@1234!',  nameTh: 'นางสาวจันทร์ อนุ1', role: 'CREDIT_OFFICER',         level: 1,    email: 'lo01@los.local' },
    { username: 'lo02',    password: 'Credit@1234!',  nameTh: 'นายสมศักดิ์ อนุ2',  role: 'SENIOR_CREDIT_OFFICER',  level: 2,    email: 'lo02@los.local' },
    { username: 'sup01',   password: 'Credit@1234!',  nameTh: 'นางวิมล หัวหน้า',   role: 'CREDIT_SUPERVISOR',      level: 3,    email: 'sup01@los.local' },
    { username: 'mgr01',   password: 'Credit@1234!',  nameTh: 'นายประสิทธิ์ ผู้จัดการ', role: 'CREDIT_MANAGER',  level: 4,    email: 'mgr01@los.local' },
    { username: 'dir01',   password: 'Credit@1234!',  nameTh: 'นางสาวรัตนา ผู้อำนวย', role: 'CREDIT_DIRECTOR',   level: 5,    email: 'dir01@los.local' },
    { username: 'vp01',    password: 'Credit@1234!',  nameTh: 'นายธนาคาร รองปธ.',  role: 'VP_CREDIT',              level: 6,    email: 'vp01@los.local' },
    { username: 'committee01', password: 'Credit@1234!', nameTh: 'นายกรรมการ คณะ', role: 'CREDIT_COMMITTEE',       level: 7,    email: 'committee01@los.local' },
    { username: 'audit01', password: 'Audit@1234!',   nameTh: 'นางสาวตรวจสอบ ออดิต', role: 'AUDIT',               level: null, email: 'audit01@los.local' },
  ];

  for (const u of usersData) {
    const existing = await userRepo.findOne({ where: { username: u.username } });
    if (!existing) {
      const ph = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
      const user = userRepo.create({
        username: u.username,
        passwordHash: ph,
        nameTh: u.nameTh,
        emailMasked: maskEmail(u.email),
        emailHash: hash(u.email),
        primaryRole: u.role as any,
        approvalLevel: u.level,
        maxApprovalAmount: u.level ? [50000, 200000, 500000, 1000000, 3000000, 10000000, 999999999][u.level - 1] : null,
        isMfaEnabled: Boolean(u.level && u.level >= 3),
        mfaType: u.level && u.level >= 3 ? 'TOTP' : null,
        isActive: true,
        passwordHistory: [ph],
        passwordChangedAt: new Date(),
        passwordExpiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000),
        createdBy: 'seed',
      });
      const saved = await userRepo.save(user);
      saved.roles = [roles[u.role]];
      await userRepo.save(saved);
    }
  }
  console.log('  ✓ Users seeded (10 users)');

  // ── 3. Products ───────────────────────────────────────────────────────────
  const productRepo = ds.getRepository(Product);
  const productsData = [
    { productCode: 'PL-001', nameTh: 'สินเชื่อส่วนบุคคล', productType: 'PERSONAL', minAmount: 10000, maxAmount: 500000, minInterestRate: 10, maxInterestRate: 28 },
    { productCode: 'HL-001', nameTh: 'สินเชื่อบ้าน',       productType: 'MORTGAGE', minAmount: 500000, maxAmount: 15000000, minInterestRate: 4.5, maxInterestRate: 7.5 },
    { productCode: 'AL-001', nameTh: 'สินเชื่อรถยนต์',     productType: 'AUTO',    minAmount: 50000, maxAmount: 3000000, minInterestRate: 3, maxInterestRate: 8 },
    { productCode: 'BL-001', nameTh: 'สินเชื่อธุรกิจ',     productType: 'BUSINESS', minAmount: 100000, maxAmount: 50000000, minInterestRate: 6, maxInterestRate: 15 },
  ];
  for (const p of productsData) {
    const ex = await productRepo.findOne({ where: { productCode: p.productCode } });
    if (!ex) await productRepo.save(productRepo.create({ ...p, status: 'ACTIVE' as any, createdBy: 'seed' }));
  }
  console.log('  ✓ Products seeded');

  // ── 4. Question Categories ────────────────────────────────────────────────
  const catRepo = ds.getRepository(QuestionCategory);
  const catData = [
    { nameTh: 'ข้อมูลส่วนตัว',  nameEn: 'Personal Information',  displayOrder: 1 },
    { nameTh: 'ข้อมูลทางการเงิน', nameEn: 'Financial Information', displayOrder: 2 },
    { nameTh: 'ข้อมูลการทำงาน', nameEn: 'Employment Information', displayOrder: 3 },
  ];
  const cats: Record<string, QuestionCategory> = {};
  for (const c of catData) {
    let cat = await catRepo.findOne({ where: { nameTh: c.nameTh } });
    if (!cat) cat = await catRepo.save(catRepo.create(c));
    cats[c.nameEn] = cat;
  }

  // ── 5. Questions ──────────────────────────────────────────────────────────
  const qRepo = ds.getRepository(Question);
  const qOptRepo = ds.getRepository(QuestionOption);
  const questionsData = [
    { code: 'Q001', cat: 'Personal Information',  text: 'สถานภาพสมรส', type: 'SINGLE_CHOICE', opts: [
      { text: 'โสด', val: 'SINGLE', score: 0 }, { text: 'แต่งงาน', val: 'MARRIED', score: 5 },
      { text: 'หย่าร้าง', val: 'DIVORCED', score: -2 }, { text: 'หม้าย', val: 'WIDOWED', score: 0 },
    ]},
    { code: 'Q002', cat: 'Financial Information',  text: 'รายได้ต่อเดือน (บาท)', type: 'NUMBER' },
    { code: 'Q003', cat: 'Financial Information',  text: 'ภาระหนี้สินต่อเดือนทั้งหมด (บาท)', type: 'NUMBER' },
    { code: 'Q004', cat: 'Employment Information', text: 'ประเภทการจ้างงาน', type: 'SINGLE_CHOICE', opts: [
      { text: 'พนักงานประจำ (มีสัญญาจ้าง)', val: 'PERMANENT', score: 10 },
      { text: 'พนักงานสัญญาจ้าง', val: 'CONTRACT', score: 5 },
      { text: 'ประกอบอาชีพอิสระ', val: 'FREELANCE', score: 3 },
      { text: 'เจ้าของกิจการ', val: 'BUSINESS_OWNER', score: 8 },
      { text: 'ข้าราชการ/รัฐวิสาหกิจ', val: 'GOVERNMENT', score: 12 },
    ]},
    { code: 'Q005', cat: 'Employment Information', text: 'อายุงาน (เดือน)', type: 'NUMBER' },
    { code: 'Q006', cat: 'Personal Information',   text: 'มีทรัพย์สินเป็นหลักประกันหรือไม่', type: 'SINGLE_CHOICE', opts: [
      { text: 'มี — อสังหาริมทรัพย์', val: 'REAL_ESTATE', score: 15 },
      { text: 'มี — รถยนต์', val: 'VEHICLE', score: 8 },
      { text: 'ไม่มี', val: 'NONE', score: 0 },
    ]},
    { code: 'Q007', cat: 'Financial Information',  text: 'เคยผิดนัดชำระหนี้ในรอบ 3 ปีที่ผ่านมาหรือไม่', type: 'SINGLE_CHOICE', opts: [
      { text: 'ไม่เคย', val: 'NEVER', score: 10 },
      { text: 'เคย 1 ครั้ง', val: 'ONCE', score: -10 },
      { text: 'เคยมากกว่า 1 ครั้ง', val: 'MULTIPLE', score: -25 },
    ]},
    { code: 'Q008', cat: 'Personal Information',   text: 'อัปโหลดสลิปเงินเดือนล่าสุด', type: 'FILE_UPLOAD' },
  ];

  for (const q of questionsData) {
    const ex = await qRepo.findOne({ where: { questionCode: q.code } });
    if (!ex) {
      const question = await qRepo.save(qRepo.create({
        questionCode: q.code,
        categoryId: cats[q.cat]?.id,
        textTh: q.text,
        type: q.type as any,
        isRequired: true,
        version: 1,
        isActive: true,
        displayOrder: parseInt(q.code.replace('Q', '')),
        createdBy: 'seed',
      }));
      if (q.opts) {
        for (let i = 0; i < q.opts.length; i++) {
          await qOptRepo.save(qOptRepo.create({
            questionId: question.id,
            textTh: q.opts[i].text,
            value: q.opts[i].val,
            score: q.opts[i].score,
            displayOrder: i + 1,
          }));
        }
      }
    }
  }
  console.log('  ✓ Questions + Options seeded');

  // ── 6. Scoring Model ───────────────────────────────────────────────────────
  const smRepo = ds.getRepository(ScoringModel);
  const ex = await smRepo.findOne({ where: { nameTh: 'แบบจำลองคะแนนพื้นฐาน' } });
  if (!ex) {
    await smRepo.save(smRepo.create({
      nameTh: 'แบบจำลองคะแนนพื้นฐาน',
      modelType: 'SIMPLE_SUM' as any,
      version: 1,
      isActive: true,
      gradeBands: [
        { grade: 'A', minScore: 80, maxScore: 100, maxLoanAmount: 5000000, action: 'APPROVE' },
        { grade: 'B', minScore: 60, maxScore: 79,  maxLoanAmount: 2000000, action: 'APPROVE' },
        { grade: 'C', minScore: 40, maxScore: 59,  maxLoanAmount: 500000,  action: 'REVIEW' },
        { grade: 'D', minScore: 0,  maxScore: 39,  maxLoanAmount: 0,       action: 'REJECT' },
      ],
      createdBy: 'seed',
    }));
  }
  console.log('  ✓ Scoring model seeded');

  // ── 7. Approval Matrix ────────────────────────────────────────────────────
  const amRepo = ds.getRepository(ApprovalMatrix);
  const matrixData = [
    { level: 1, minAmount: 0,          maxAmount: 50000,      roleName: 'Credit Officer',        slaHours: 4,   escalationLevel: 2 },
    { level: 2, minAmount: 50001,      maxAmount: 200000,     roleName: 'Senior Credit Officer', slaHours: 8,   escalationLevel: 3 },
    { level: 3, minAmount: 200001,     maxAmount: 500000,     roleName: 'Credit Supervisor',     slaHours: 24,  escalationLevel: 4 },
    { level: 4, minAmount: 500001,     maxAmount: 1000000,    roleName: 'Credit Manager',        slaHours: 48,  escalationLevel: 5 },
    { level: 5, minAmount: 1000001,    maxAmount: 3000000,    roleName: 'Credit Director',       slaHours: 72,  escalationLevel: 6 },
    { level: 6, minAmount: 3000001,    maxAmount: 10000000,   roleName: 'VP Credit',             slaHours: 120, escalationLevel: 7 },
    { level: 7, minAmount: 10000001,   maxAmount: 999999999,  roleName: 'Credit Committee',      slaHours: 168, escalationLevel: null, quorumRequired: 3 },
  ];
  for (const m of matrixData) {
    const ex = await amRepo.findOne({ where: { level: m.level } });
    if (!ex) await amRepo.save(amRepo.create({ ...m, isActive: true, createdBy: 'seed' }));
  }
  console.log('  ✓ Approval Matrix seeded (7 levels)');

  // ── 8. Approval Criteria ──────────────────────────────────────────────────
  const acRepo = ds.getRepository(ApprovalCriteria);
  const exCriteria = await acRepo.findOne({ where: { name: 'เกณฑ์มาตรฐานสินเชื่อ' } });
  if (!exCriteria) {
    await acRepo.save(acRepo.create({
      name: 'เกณฑ์มาตรฐานสินเชื่อ',
      minCreditScore: 40,
      maxDsr: 60,
      minEmploymentMonths: 6,
      allowedEmploymentTypes: ['PERMANENT', 'GOVERNMENT', 'BUSINESS_OWNER', 'CONTRACT', 'FREELANCE'],
      autoRejectRules: [
        { condition: 'blacklist_match', reason: 'ลูกค้าอยู่ในบัญชีดำ' },
        { condition: 'score < 40', reason: 'คะแนนเครดิตต่ำกว่าเกณฑ์' },
        { condition: 'dsr > 60', reason: 'ภาระหนี้เกิน 60% ของรายได้' },
      ],
      autoApproveRules: [
        { condition: 'score >= 85 AND amount <= 50000', maxAmount: 50000 },
      ],
      version: 1,
      effectiveFrom: new Date(),
      isActive: true,
      createdBy: 'seed',
    }));
  }
  console.log('  ✓ Approval Criteria seeded');

  await ds.destroy();
  console.log('\n✅ Seed complete!');
  console.log('\n📋 Default Login Accounts:');
  console.log('   admin        / Admin@1234!   (ADMIN)');
  console.log('   sale01       / Sale@1234!    (SALE)');
  console.log('   lo01         / Credit@1234!  (L1 — Credit Officer)');
  console.log('   lo02         / Credit@1234!  (L2 — Senior Credit Officer)');
  console.log('   sup01        / Credit@1234!  (L3 — Credit Supervisor, MFA required)');
  console.log('   mgr01        / Credit@1234!  (L4 — Credit Manager, MFA required)');
  console.log('   dir01        / Credit@1234!  (L5 — Credit Director, MFA required)');
  console.log('   vp01         / Credit@1234!  (L6 — VP Credit, MFA required)');
  console.log('   committee01  / Credit@1234!  (L7 — Credit Committee, MFA required)');
  console.log('   audit01      / Audit@1234!   (AUDIT)');
}

seed().catch((err) => { console.error('❌ Seed failed:', err); process.exit(1); });
