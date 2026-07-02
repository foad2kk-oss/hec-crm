-- ============================================================================
-- Sample seed data for local development / demos.
-- Run AFTER schema.sql and AFTER you have signed up at least one user
-- (profiles are created automatically via the auth trigger).
-- Replace the assigned_engineer_id values below with a real profile id from:
--   select id, full_name from profiles;
-- ============================================================================

insert into clients (
  company_name, contact_person, position, mobile, email, website,
  industry, factory_type, city, industrial_city, project_status,
  expected_construction_date, estimated_budget, estimated_area,
  owner_name, lead_source, lead_score, priority, probability,
  expected_revenue, current_stage, tags, notes
) values
  ('مصنع الرياض للبلاستيك', 'محمد العتيبي', 'المدير العام', '0501234567',
   'contact@riyadh-plastics.sa', 'https://riyadh-plastics.sa',
   'Plastic', 'Manufacturing', 'Riyadh', 'Second Industrial City', 'Planning',
   now() + interval '4 months', 25000000, 12000,
   'محمد العتيبي', 'MODON', 78, 'hot', 65, 450000, 'qualified',
   array['plastic','riyadh','hot'], 'اجتماع أولي إيجابي جداً، بانتظار عرض فني'),
  ('شركة الجبيل للكيماويات', 'Ahmed Al-Qahtani', 'CEO', '0559876543',
   'info@jubail-chem.sa', 'https://jubail-chem.sa',
   'Chemical', 'Processing Plant', 'Jubail', 'Jubail Industrial City', 'Under Construction',
   now() + interval '2 months', 120000000, 45000,
   'Ahmed Al-Qahtani', 'SPARK', 88, 'hot', 80, 1800000, 'proposal_sent',
   array['chemical','jubail'], 'يحتاج استشاري MEP عاجل'),
  ('مصنع دمام للأغذية', 'سارة الدوسري', 'مديرة المشتريات', '0567891234',
   'procurement@dammam-food.sa', 'https://dammam-food.sa',
   'Food', 'Food Factory', 'Dammam', 'Dammam Third Industrial City', 'Feasibility Study',
   now() + interval '8 months', 8000000, 5000,
   'خالد الدوسري', 'Website', 45, 'warm', 30, 120000, 'new_lead',
   array['food','dammam'], 'تواصل أولي عبر الموقع الإلكتروني');

insert into discovered_leads (
  company, project, location, source_link, estimated_project_size,
  industry, investment_value, status, confidence_score, ai_summary,
  suggested_action, search_query
) values
  ('مصنع الخليج للصلب', 'توسعة خط إنتاج الصلب', 'Jubail Industrial City',
   'https://www.spa.gov.sa/example-steel-expansion', '30,000 sqm',
   'Steel', 95000000, 'new', 82,
   'أعلنت الشركة عن توقيع عقد مع الهيئة الملكية لتوسعة خط إنتاج الصلب، من المتوقع بدء الإنشاء خلال 6 أشهر.',
   'التواصل المباشر مع مدير المشتريات لعرض خدمات الاستشارات الهندسية', 'Royal Commission announcements'),
  ('Modern Logistics Co.', 'مستودع لوجستي متعدد الاستخدامات', 'King Salman Energy Park (SPARK)',
   'https://spark.sa/example-warehouse', '18,000 sqm',
   'Logistics', 40000000, 'new', 74,
   'حصلت الشركة على أرض صناعية في سبارك لإنشاء مستودعات لوجستية متكاملة.',
   'إرسال بروفايل الشركة ومتابعة عبر البريد الإلكتروني', 'SPARK land allocations');
