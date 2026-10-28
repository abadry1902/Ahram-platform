# التحقق من اتصال Supabase — 2026-10-25

| البند | النتيجة |
|---|---|
| الاتصال المحدد | Masterframe 01 |
| Organization | masterframe-01 Org (`awrqdgfctuackipjgqcj`) |
| المشروع الموجود | masterframe 01 (`tfidmxlaugqcwskanmxk`) |
| المنطقة والحالة | eu-west-1، ACTIVE_HEALTHY |
| جداول public | 0 |
| سجل الترحيلات | 0 |
| متغيرات موقع الأهرام | فارغة، revision 0 |
| غرض QA / الإنتاج | يحتاج تحديد المالك |
| الإجراءات البعيدة | قوائم وفحص كتالوج الصلاحيات فقط |
| تغييرات بعيدة / نشر | لا يوجد |

منح الوظائف الافتراضية في هذا المشروع تشمل منحًا مباشرة لـ anon وauthenticated. لهذا أضيف إصلاح صريح للمنح ورفض هوية UID الفارغة إلى الترحيلات قبل أول تطبيق. تم اختبار الملفات الستة محليًا، ولم تُطبّق على المشروع.

أظهر Security Advisor تحذيري EXECUTE لدالة المنصة `public.rls_auto_enable()`؛ الفحص أوضح أنها event trigger مع search_path مضبوط، ولا يثبت التحذير أنها RPC قابلة للاستغلال. لم تُعدّل الدالة. المرجعان: [منح الزائر](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)، [منح المستخدم](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

لم تعرض أدوات Supabase بريد مالك الحساب؛ تطابق اسم الاتصال والمنظمة والمشروع هو دليل التحقق المتاح. لم نستخدم مشروع EgyToys، ولم نطلب أو نسجل أي كلمات مرور أو مفاتيح سرية. توصيل الإضافة لا يعني أن التطبيق أصبح متصلًا بقاعدة البيانات.
