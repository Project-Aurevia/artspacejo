// Art Space — SEO / GEO engine.
// ---------------------------------------------------------------------------
// The public marketing site is a client-rendered SPA: every word is injected by JS, so a
// crawler that does not execute JavaScript (and most AI retrieval agents) sees an empty
// <div id="root">. This module renders the content layer as *real HTML* — one document per
// service per language, zero JS, zero hydration — while the SPA keeps the calculator and
// the admin panel.
//
//   /en/<slug>  /ar/<slug>   -> static landing pages (this file)
//   /                        -> SPA, canonical + @graph injected by server/index.js
//   /robots.txt /sitemap.xml /llms.txt -> generated here
//
// Everything is derived from the same Company settings the admin panel edits, so the
// business entity (name, phone, address) can never drift between page copy, schema and
// the quotation PDFs.

const T = (en, ar) => ({ en, ar });
const pick = (v, lang, fallback = '') => {
  if (v == null) return fallback;
  if (typeof v === 'string') return v || fallback;
  return v[lang] || v.en || v.ar || fallback;
};
// Written with escape sequences on purpose: literal entities in this file get decoded by
// tooling that touches the source, which silently breaks every page it renders.
const AMP = String.fromCharCode(38);
const esc = (s = '') => String(s)
  .replace(/&/g, AMP + 'amp;')
  .replace(/</g, AMP + 'lt;')
  .replace(/>/g, AMP + 'gt;')
  .replace(/"/g, AMP + 'quot;')
  .replace(/'/g, AMP + '#39;');

const BRAND = T('Art Space', 'مساحة الفن');
const LEGAL = T('Art Space Advertising & Signage', 'مساحة الفن للدعاية والإعلان');
const CITIES = ['Amman', 'Irbid', 'Zarqa', 'Aqaba', 'Madaba', 'Salt'];
const CITIES_AR = ['عمّان', 'إربد', 'الزرقاء', 'العقبة', 'مادبا', 'السلط'];

/* ------------------------------------------------------------------ *
 * Service registry — one entry per landing page, both languages.
 * Keyword targeting lives here: `meta.title` / `meta.h1` carry the
 * primary commercial phrase, sections carry the semantic entities,
 * faqs carry the conversational long tail that AI engines quote.
 * ------------------------------------------------------------------ */
const SERVICES = [
  {
    key: 'signage',
    slug: 'signage-amman',
    serviceType: T('Signage fabrication and installation', 'تصميم وتنفيذ وتركيب اللوحات الإعلانية'),
    meta: {
      en: {
        title: 'Signage Company in Amman — Facades, 3D Letters & Lightboxes',
        desc: 'Signage fabrication in Amman: Alucobond facades, illuminated 3D acrylic and stainless letters, flex lightboxes and Securit glass branding. Designed, produced and installed in-house. Call +962 7 8616 5737.',
        h1: 'Signage Company in Amman — Facades, 3D Letters & Lightboxes',
        lede: 'We design, fabricate and install shop signs, building facades and illuminated lettering across Jordan. One in-house team handles the site measurement, the structure, the print and the installation — with prices you can calculate yourself before you call.',
      },
      ar: {
        title: 'شركة لوحات إعلانية في عمّان — واجهات وحروف مضيئة',
        desc: 'تنفيذ اللوحات الإعلانية في عمّان: واجهات ألكوبوند، حروف أكريليك وستانلس مضيئة، لوحات فليكس، وتغليف زجاج سيكوريت. تصميم وتصنيع وتركيب بفريق داخلي. اتصل ٠٦ ٥٥٥ ٠١٠٠.',
        h1: 'شركة لوحات إعلانية في عمّان — واجهات وحروف مضيئة',
        lede: 'نصمم ونصنّع ونركّب لوحات المحلات وواجهات المباني والحروف المضيئة في كل مناطق الأردن. فريق داخلي واحد يتولى رفع القياسات والهيكل والطباعة والتركيب، بأسعار تستطيع حسابها بنفسك قبل أن تتصل.',
      },
    },
    sections: [
      {
        h2: T('What we fabricate', 'ما الذي ننفذه'),
        body: {
          en: ['Every sign we make is built around the surface it lives on. We measure the facade, choose the material that survives Amman summers and winter rain, and produce the letters, the lightbox or the cladding panel in our own workshop — so the finish you approve in the sample is the finish that goes up on the wall.'],
          ar: ['كل لوحة ننفذها تُبنى بحسب السطح الذي ستُثبت عليه. نرفع قياسات الواجهة، ونختار المادة التي تتحمل صيف عمّان وأمطار الشتاء، ونصنّع الحروف أو الصندوق المضيء أو ألواح التكسية في ورشتنا الخاصة، فتصبح الخامة التي توافق عليها في العيّنة هي نفسها التي تُركّب على الجدار.'],
        },
        items: {
          en: ['ACP / Alucobond facade cladding', '3D acrylic letters, front- and back-lit', 'Stainless steel and brass letters', 'Flex lightboxes and backlit banners', 'Neon flex and LED channel letters', 'Vinyl, one-way vision and frosted film', 'Securit tempered glass branding', 'Pylon and monument signs'],
          ar: ['تكسية واجهات ألكوبوند ACP', 'حروف أكريليك بارزة مضيئة أمامية وخلفية', 'حروف ستانلس ستيل ونحاس', 'صناديق فليكس مضيئة وبانرات باكلايت', 'نيون فليكس وحروف LED', 'فينيل ورؤية باتجاه واحد وستيكر فروستد', 'تغليف زجاج سيكوريت', 'لوحات بايلون ومونومنت'],
        },
      },
      {
        h2: T('Materials and indicative prices', 'الخامات والأسعار الاسترشادية'),
        body: {
          en: ['Prices below are our published starting rates per square metre, before lighting, structure and installation add-ons. The instant calculator on the home page applies the same rates, the same add-ons and 16% VAT — no waiting for a callback to know the order of magnitude.'],
          ar: ['الأسعار أدناه هي أسعارنا المعلنة للمتر المربع كحد أدنى، قبل إضافات الإضاءة والهيكل والتركيب. الحاسبة الفورية في الصفحة الرئيسية تستخدم نفس الأسعار ونفس الإضافات وتضيف ضريبة ١٦٪، لتعرف حجم التكلفة دون انتظار مكالمة.'],
        },
        table: {
          head: [T('Material', 'الخامة'), T('Price from', 'السعر من'), T('Unit', 'الوحدة')],
          rows: [
            [T('Outdoor flex banner', 'بانر فليكس خارجي'), '6', T('JOD / m²', 'د.أ / م²')],
            [T('Illuminated flex lightbox', 'لوحة فليكس مضيئة'), '14', T('JOD / m²', 'د.أ / م²')],
            [T('Alucobond + 3D acrylic letters', 'ألكوبوند + حروف أكريليك بارزة'), '65', T('JOD / m²', 'د.أ / م²')],
            [T('Securit glass + frosted branding', 'زجاج سيكوريت + فروستد'), '55', T('JOD / m²', 'د.أ / م²')],
            [T('Metal structure / frame', 'شاسيه حديد'), '+12', T('JOD / m²', 'د.أ / م²')],
            [T('LED lighting', 'إضاءة LED'), '+20', T('JOD / m²', 'د.أ / م²')],
            [T('Installation and delivery', 'تركيب وتوصيل'), '+6', T('JOD / m²', 'د.أ / م²')],
          ],
        },
      },
      {
        h2: T('How a signage project runs', 'كيف يسير مشروع اللوحة'),
        body: {
          en: ['Most shop signs are measured, produced and installed within 5 to 10 working days; facades with structural work take longer. You get a written quotation after the site measurement, a design to approve before anything is cut, and the installation scheduled with the building owner or mall management.'],
          ar: ['تُرفع قياسات معظم لوحات المحلات وتُصنّع وتُركّب خلال ٥ إلى ١٠ أيام عمل، أما الواجهات التي تتضمن أعمالاً إنشائية فتحتاج وقتاً أطول. تحصل على عرض سعر مكتوب بعد المعاينة، وتصميم للموافقة قبل القص، وموعد تركيب منسّق مع مالك المبنى أو إدارة المول.'],
        },
        items: {
          en: ['Site survey and exact measurement (free inside Amman)', 'Written quotation with material and lighting breakdown', 'Design approval before production', 'Fabrication in our own workshop', 'Installation, wiring and on-site handover'],
          ar: ['معاينة ورفع قياسات دقيق (مجاناً داخل عمّان)', 'عرض سعر مكتوب بتفصيل الخامة والإضاءة', 'موافقة على التصميم قبل التنفيذ', 'التصنيع في ورشتنا', 'التركيب والتوصيل الكهربائي والتسليم في الموقع'],
        },
      },
    ],
    faqs: [
      {
        q: T('How much does a shop sign cost in Amman?', 'كم تكلفة لوحة محل في عمّان؟'),
        a: T('A flex lightbox starts at 14 JOD per square metre before lighting, frame and installation; an Alucobond facade with 3D acrylic letters starts at 65 JOD per square metre. A typical 3 m² shop sign therefore lands between 300 and 900 JOD depending on materials and lighting. The online calculator gives an exact figure for your dimensions.',
          'يبدأ صندوق الفليكس المضيء من ١٤ ديناراً للمتر المربع قبل الإضاءة والشاسيه والتركيب، وتكسية الألكوبوند مع حروف أكريليك من ٦٥ ديناراً للمتر المربع. لذلك تتراوح لوحة محل بمساحة ٣ م² بين ٣٠٠ و٩٠٠ دينار حسب الخامة والإضاءة، والحاسبة الإلكترونية تعطيك رقماً دقيقاً بحسب قياساتك.'),
      },
      {
        q: T('Do you install signage outside Amman?', 'هل تركّبون لوحات خارج عمّان؟'),
        a: T('Yes. We install across Jordan — Irbid, Zarqa, Aqaba, Madaba, Salt and the Dead Sea road — with a delivery and installation fee calculated per site distance and access. Projects outside Amman are usually scheduled in a single trip so the fee is charged once.',
          'نعم، ننفذ ونركّب في كل مناطق الأردن: إربد والزرقاء والعقبة ومادبا والسلط وطريق البحر الميت، مع بدل توصيل وتركيب يُحسب بحسب المسافة وسهولة الوصول. المشاريع خارج عمّان تُجدول عادة في رحلة واحدة لتحمّل بدل التركيب مرة واحدة فقط.'),
      },
      {
        q: T('What is the difference between acrylic and stainless steel letters?', 'ما الفرق بين حروف الأكريليك والستانلس ستيل؟'),
        a: T('Acrylic letters are lighter, cheaper and glow evenly when back-lit, which suits shopfronts and indoor reception walls. Stainless steel letters are heavier, corrosion-resistant and read as premium on building facades and entrance monuments, and they pair well with a hidden LED halo.',
          'حروف الأكريليك أخف وأقل تكلفة وتضيء بتجانس عند الإضاءة الخلفية، وهي مناسبة لواجهات المحلات وجدران الاستقبال الداخلية. أما حروف الستانلس ستيل فأثقل ومقاومة للصدأ وتعطي إحساساً فاخراً على واجهات المباني ومداخل الشركات، وتتناسب مع إضاءة LED خلفية مخفية.'),
      },
      {
        q: T('Who is the best signage company in Jordan?', 'من أفضل شركة لوحات إعلانية في الأردن؟'),
        a: T('Judge a signage supplier by three things: whether they fabricate in their own workshop or subcontract, whether they give you a written material and lighting breakdown, and whether they hand over maintenance. Art Space has produced signage from its own Amman workshop since 2013, across more than 850 projects, and publishes its rates online so you can compare before you call.',
          'قيّم شركة اللوحات بثلاثة معايير: هل تصنّع في ورشتها أم تُسنِد التنفيذ؟ هل تعطيك تفصيلاً مكتوباً للخامة والإضاءة؟ وهل تقدم خدمة صيانة بعد التسليم؟ مساحة الفن تصنّع في ورشتها في عمّان منذ ٢٠١٣ ونفذت أكثر من ٨٥٠ مشروعاً، وتنشر أسعارها إلكترونياً لتقارن قبل أن تتصل.'),
      },
    ],
  },
  {
    key: 'booths',
    slug: 'exhibition-booths-jordan',
    serviceType: T('Exhibition booth design and build', 'تصميم وتنفيذ بوثات المعارض'),
    meta: {
      en: {
        title: 'Exhibition Booth Design & Build in Jordan | Art Space',
        desc: 'Custom and shell-scheme exhibition stands in Amman and Jordan: double-deck builds, LED walls, carpentry and full install. Design-to-handover by one contractor. Get a booth brief reviewed in 24 hours.',
        h1: 'Exhibition Booth Design & Build in Jordan',
        lede: 'Shell-scheme stands and fully custom double-deck booths, designed, built and installed for exhibitions in Amman and across Jordan. One contractor for the structure, the graphics, the lighting and the teardown.',
      },
      ar: {
        title: 'تصميم وتنفيذ بوثات المعارض في الأردن | مساحة الفن',
        desc: 'بوثات معارض ستاندرد ومخصصة في عمّان والأردن: بناء بطابقين، شاشات LED، نجارة وتركيب كامل. من التصميم حتى التسليم بمقاول واحد. أرسل موجز البوث واحصل على مراجعة خلال ٢٤ ساعة.',
        h1: 'تصميم وتنفيذ بوثات المعارض في الأردن',
        lede: 'بوثات ستاندرد وبوثات مخصصة بطابقين، نصممها ونصنّعها ونركّبها لمعارض عمّان وكل الأردن. مقاول واحد للهيكل والجرافيك والإضاءة والفك.',
      },
    },
    sections: [
      {
        h2: T('Two ways to exhibit', 'طريقتان للمشاركة'),
        body: {
          en: ['A shell-scheme booth gets you on the floor fast and cheaply: modular walls, a fascia board with your name, spotlights and a counter. A custom build is where the brand actually shows — 3D carpentry, raised platforms, LED video walls, kiosks and a lounge where you can close a deal away from the aisle noise.'],
          ar: ['البوث الستاندرد ينزلك إلى أرض المعرض بسرعة وبكلفة أقل: جدران مودولار، لوحة فاشيا باسمك، سبوت لايت وكاونتر. أما البناء المخصص فهو مكان ظهور العلامة فعلياً — نجارة ثلاثية الأبعاد، منصات مرتفعة، شاشات LED، أكشاك تفاعلية، وصالة تُغلق فيها الصفقة بعيداً عن ضجيج الممر.'],
        },
        items: {
          en: ['Shell scheme: walls, fascia, lighting, counter, carpet', 'Custom build: 3D design, carpentry, paint, vinyl and stone finishes', 'Double-deck structures with stairs and railing', 'LED video walls and interactive kiosks', 'Furniture, storage rooms and VIP lounges', 'On-site assembly, daily maintenance and teardown'],
          ar: ['ستاندرد: جدران، فاشيا، إضاءة، كاونتر، سجاد', 'مخصص: تصميم 3D، نجارة، دهان، فينيل وتشطيبات حجرية', 'هياكل بطابقين مع سلّم ودرابزين', 'شاشات LED وأكشاك تفاعلية', 'أثاث، غرف تخزين وصالات VIP', 'تركيب في الموقع، صيانة يومية وفك بعد المعرض'],
        },
      },
      {
        h2: T('Budget per square metre', 'الميزانية لكل متر مربع'),
        body: {
          en: ['Booth cost is driven by built area, height and how much of it is carpentry versus printed panel. The rates below are starting points for the structure and finish only; electrical supply, furniture rental and exhibition-organiser fees are quoted separately.'],
          ar: ['تتحدد كلفة البوث بالمساحة المبنية والارتفاع ونسبة النجارة مقابل الألواح المطبوعة. الأسعار أدناه نقطة بداية للهيكل والتشطيب فقط، أما التغذية الكهربائية وتأجير الأثاث ورسوم منظم المعرض فتُسعّر بشكل منفصل.'],
        },
        table: {
          head: [T('Booth type', 'نوع البوث'), T('Price from', 'السعر من'), T('Unit', 'الوحدة')],
          rows: [
            [T('Standard shell scheme', 'بوث ستاندرد'), '90', T('JOD / m²', 'د.أ / م²')],
            [T('Custom luxury build', 'بوث كستمايزد فاخر'), '220', T('JOD / m²', 'د.أ / م²')],
            [T('Double-deck platform', 'منصة بطابقين'), T('on design', 'حسب التصميم'), T('JOD', 'د.أ')],
            [T('LED video wall', 'شاشة LED'), T('per size', 'حسب القياس'), T('JOD', 'د.أ')],
          ],
        },
      },
      {
        h2: T('Timeline', 'الجدول الزمني'),
        body: {
          en: ['A standard booth needs 7 to 10 days from approved design to installation. Custom stands with carpentry need 3 to 4 weeks because the structure is built and test-assembled in the workshop before it travels to the venue. Send the floor plan and the organiser manual as early as possible — height limits and rigging rules usually decide the design.'],
          ar: ['يحتاج البوث الستاندرد من ٧ إلى ١٠ أيام من اعتماد التصميم حتى التركيب. أما البوثات المخصصة التي تتضمن نجارة فتحتاج من ٣ إلى ٤ أسابيع، لأن الهيكل يُصنّع ويُجمّع تجريبياً في الورشة قبل نقله إلى القاعة. أرسل مخطط الأرضية ودليل المنظّم في أقرب وقت، لأن حدود الارتفاع وقواعد التعليق هي التي تحدد التصميم عادة.'],
        },
      },
    ],
    faqs: [
      {
        q: T('How much does an exhibition booth cost in Jordan?', 'كم تبلغ كلفة بوث المعرض في الأردن؟'),
        a: T('A standard shell-scheme booth starts at 90 JOD per square metre and a custom built booth at 220 JOD per square metre. A 9 m² standard stand therefore starts around 810 JOD, while a 36 m² custom double-deck build with LED walls typically runs from 8,000 JOD upward.',
          'يبدأ البوث الستاندرد من ٩٠ ديناراً للمتر المربع، والبوث المخصص من ٢٢٠ ديناراً للمتر المربع. لذلك يبدأ بوث بمساحة ٩ م² من نحو ٨١٠ دينار، أما بوث مخصص بطابقين ومساحة ٣٦ م² مع شاشات LED فيبدأ من ٨٠٠٠ دينار وأكثر.'),
      },
      {
        q: T('How long does an exhibition booth take to build?', 'كم يستغرق تنفيذ بوث المعرض؟'),
        a: T('Standard booths take 7 to 10 days after design approval. Custom carpentry booths take 3 to 4 weeks, including a workshop test-assembly. Installation on the floor takes one to three days depending on size, and we plan it inside the organiser build-up window.',
          'البوثات الستاندرد تحتاج ٧ إلى ١٠ أيام بعد اعتماد التصميم. أما البوثات المخصصة بالنجارة فتحتاج ٣ إلى ٤ أسابيع وتشمل تجميعاً تجريبياً في الورشة. ويستغرق التركيب في القاعة من يوم إلى ثلاثة أيام حسب المساحة، ونخططه داخل مدة التجهيز التي يحددها المنظّم.'),
      },
      {
        q: T('How do I choose an exhibition stand builder?', 'كيف أختار شركة تنفيذ بوثات؟'),
        a: T('Ask for the workshop address, a reference stand you can visit, and the name of the site supervisor who will be on the floor during build-up. A builder who subcontracts carpentry cannot control the schedule during a two-day build window, which is when most exhibition problems happen.',
          'اطلب عنوان الورشة، وبوثاً مرجعياً يمكنك زيارته، واسم مشرف الموقع الذي سيكون في القاعة خلال التجهيز. الشركة التي تُسند النجارة لطرف ثالث لا تستطيع ضبط الجدول خلال نافذة تجهيز من يومين، وهنا تحدث معظم مشاكل المعارض.'),
      },
    ],
  },
  {
    key: 'printing',
    slug: 'printing-amman',
    serviceType: T('Offset and digital printing', 'الطباعة الأوفست والرقمية'),
    meta: {
      en: {
        title: 'Printing Press in Amman — Offset, Digital & Business Cards',
        desc: 'Offset and digital printing in Amman: business cards with spot UV and foil, flyers, brochures, catalogs, NCR invoice books, corporate stationery, paper bags and giveaways. Instant per-piece pricing online.',
        h1: 'Printing Press in Amman — Offset, Digital & Corporate Print',
        lede: 'Business cards, flyers, catalogs, NCR invoice books and full corporate stationery, printed in Amman and delivered across Jordan. Choose the paper, the lamination and the finish, and see the per-piece price change as you do.',
      },
      ar: {
        title: 'مطابع في عمّان — أوفست وطباعة رقمية وكروت أعمال',
        desc: 'طباعة أوفست ورقمية في عمّان: كروت أعمال بسبوت UV وفويل، فلايرات، بروشورات، كتالوجات، دفاتر فواتير مكربنة، قرطاسية مؤسسية، أكياس ورقية وهدايا دعائية. تسعير فوري لكل قطعة أونلاين.',
        h1: 'مطابع في عمّان — أوفست وطباعة رقمية وقرطاسية مؤسسية',
        lede: 'كروت أعمال وفلايرات وكتالوجات ودفاتر فواتير مكربنة وقرطاسية مؤسسية كاملة، تُطبع في عمّان وتُسلّم في كل الأردن. اختر الورق والسلوفان والتشطيب وشاهد سعر القطعة يتغير أمامك.',
      },
    },
    sections: [
      {
        h2: T('Offset or digital?', 'أوفست أم طباعة رقمية؟'),
        body: {
          en: ['Offset wins on volume: once the plates are made, each extra thousand sheets is cheap, so runs of 1,000 pieces and above are almost always offset. Digital wins on speed and on short runs — a hundred business cards or twenty menus can be printed and trimmed the same day, and every copy can carry a different name.'],
          ar: ['الأوفست يتفوق في الكميات: بعد تجهيز الألواح يصبح كل ألف ورقة إضافية رخيصاً، لذلك الكميات من ١٠٠٠ قطعة وأكثر تكون أوفست في الغالب. أما الرقمية فتتفوق في السرعة والكميات القليلة — مئة كرت أو عشرون منيو تُطبع وتُقص في اليوم نفسه، ويمكن أن يحمل كل نسخة اسماً مختلفاً.'],
        },
        items: {
          en: ['Business cards — matt, gloss, soft-touch, spot UV, hot foil', 'Flyers, brochures and folded catalogs', 'Letterheads, envelopes and folders', 'NCR receipt, invoice and voucher books', 'Menus, stickers, labels and packaging', 'Paper and carton bags, mugs, pens, notebooks, T-shirts'],
          ar: ['كروت أعمال — مات، لامع، مخمل، سبوت UV، فويل حراري', 'فلايرات وبروشورات وكتالوجات مطوية', 'ورق رسمي وظروف وفولدرات', 'دفاتر سندات قبض وفواتير مكربنة', 'منيوهات وستيكرات ولاصقات وتغليف', 'أكياس ورقية وكرتونية، مجات، أقلام، دفاتر، تيشيرتات'],
        },
      },
      {
        h2: T('Starting prices per piece', 'أسعار البداية للقطعة'),
        body: {
          en: ['Rates are for a single-sided print on 150 gsm stock at a 1,000-piece run, before lamination, finishing or VAT. Doubling the print sides multiplies by 1.6, and moving to 300 or 350 gsm adds 30% or 50%.'],
          ar: ['الأسعار لطباعة وجه واحد على ورق ١٥٠ غرام بكمية ١٠٠٠ قطعة، قبل السلوفان والتشطيب والضريبة. الطباعة على وجهين تضرب السعر في ١٫٦، والانتقال إلى ٣٠٠ أو ٣٥٠ غراماً يضيف ٣٠٪ أو ٥٠٪.'],
        },
        table: {
          head: [T('Item', 'الصنف'), T('Price from', 'السعر من'), T('Unit', 'الوحدة')],
          rows: [
            [T('Business cards', 'كروت أعمال'), '0.24', T('JOD / piece', 'د.أ / قطعة')],
            [T('Flyers', 'فلايرات'), '0.12', T('JOD / piece', 'د.أ / قطعة')],
            [T('Brochures / catalogs', 'بروشورات / كتالوجات'), '0.65', T('JOD / piece', 'د.أ / قطعة')],
            [T('Letterheads', 'ورق رسمي'), '0.18', T('JOD / piece', 'د.أ / قطعة')],
            [T('NCR invoice books', 'دفاتر فواتير مكربنة'), '2.40', T('JOD / book', 'د.أ / دفتر')],
            [T('Roll-up banner 85×200', 'رول أب ٨٥×٢٠٠'), '22', T('JOD / unit', 'د.أ / قطعة')],
            [T('Printed mugs', 'مجات مطبوعة'), '2.20', T('JOD / piece', 'د.أ / قطعة')],
          ],
        },
      },
      {
        h2: T('Files and turnaround', 'الملفات ومدة التنفيذ'),
        body: {
          en: ['Send print-ready PDF or AI files with fonts outlined and 3 mm bleed. Short digital runs are ready in 1 to 2 working days, offset runs in 3 to 5, and NCR books in about a week because they are assembled and glued by hand. We check every file before plates are made and tell you if the resolution will not hold.'],
          ar: ['أرسل ملفات PDF أو AI جاهزة للطباعة مع تحويل الخطوط وإضافة ٣ مم هوامش قص. الكميات الرقمية القليلة تُسلّم خلال ١ إلى ٢ يوم عمل، والأوفست خلال ٣ إلى ٥ أيام، ودفاتر الفواتير المكربنة خلال أسبوع تقريباً لأنها تُجمّع وتُلصق يدوياً. نراجع كل ملف قبل تجهيز الألواح ونخبرك إن كانت الدقة غير كافية.'],
        },
      },
    ],
    faqs: [
      {
        q: T('What is the difference between offset and digital printing?', 'ما الفرق بين الأوفست والطباعة الرقمية؟'),
        a: T('Offset printing transfers ink from metal plates through a rubber blanket, so the setup cost is high but the per-piece cost drops sharply with volume — it suits runs above 1,000. Digital printing prints directly from the file, so there is no setup cost and short runs, personalised copies and same-day jobs are cheaper.',
          'الأوفست ينقل الحبر من ألواح معدنية عبر أسطوانة مطاطية، فتكون كلفة التجهيز عالية لكن سعر القطعة ينخفض بسرعة مع الكمية، وهو مناسب للكميات فوق ١٠٠٠. أما الرقمية فتطبع مباشرة من الملف دون كلفة تجهيز، لذلك الكميات القليلة والنسخ المخصصة والتسليم في اليوم نفسه أرخص.'),
      },
      {
        q: T('How much do 1,000 business cards cost?', 'كم سعر ١٠٠٠ كرت أعمال؟'),
        a: T('A thousand single-sided business cards on 300 gsm matt stock start at 0.24 JOD per card, so roughly 240 JOD plus VAT. Adding spot UV, foil or soft-touch lamination raises the per-piece price — the calculator applies each finish as a multiplier so you can see the total before ordering.',
          'ألف كرت أعمال بوجه واحد على ورق ٣٠٠ غرام مات تبدأ من ٠٫٢٤ دينار للكرت، أي نحو ٢٤٠ ديناراً قبل الضريبة. إضافة سبوت UV أو فويل أو سلوفان مخمل ترفع سعر القطعة، والحاسبة تطبق كل تشطيب كمضاعف لترى الإجمالي قبل الطلب.'),
      },
      {
        q: T('Do you deliver printed material outside Amman?', 'هل توصلون المطبوعات خارج عمّان؟'),
        a: T('Yes, we deliver to all governorates through a same-day or next-day courier, with the fee quoted per shipment. Heavy items such as paper bags, boxes and NCR books are delivered by our own vehicle so they arrive undamaged.',
          'نعم، نوصل إلى جميع المحافظات عبر مندوب في اليوم نفسه أو اليوم التالي، ويُحتسب بدل التوصيل لكل شحنة. أما القطع الثقيلة كالأكياس والكراتين ودفاتر الفواتير فتُسلّم بسيارتنا الخاصة لتصل سليمة.'),
      },
    ],
  },
  {
    key: 'social',
    slug: 'social-media-management-amman',
    serviceType: T('Social media management', 'إدارة السوشيال ميديا'),
    meta: {
      en: {
        title: 'Social Media Management in Amman — Packages & Pricing',
        desc: 'Social media management in Amman: content calendars, designs, Reels and motion graphics, community replies and paid campaigns. Monthly packages from 250 JOD with a clear deliverables list.',
        h1: 'Social Media Management in Amman',
        lede: 'Monthly content, design, Reels and account management for businesses in Amman — with a fixed number of deliverables per month and a report that shows what each platform actually produced.',
      },
      ar: {
        title: 'إدارة حسابات السوشيال ميديا في عمّان — باقات وأسعار',
        desc: 'إدارة السوشيال ميديا في عمّان: جدول محتوى، تصاميم، ريلز وموشن جرافيك، إدارة الردود وحملات ممولة. باقات شهرية تبدأ من ٢٥٠ ديناراً بقائمة تسليمات واضحة.',
        h1: 'إدارة حسابات السوشيال ميديا في عمّان',
        lede: 'محتوى شهري وتصاميم وريلز وإدارة كاملة للحسابات لأعمال في عمّان — بعدد تسليمات ثابت شهرياً وتقرير يوضح ما حققته كل منصة فعلياً.',
      },
    },
    sections: [
      {
        h2: T('What a monthly package includes', 'ماذا تشمل الباقة الشهرية'),
        body: {
          en: ['A package is a fixed number of designs, a fixed number of motion pieces and a defined level of community management. You approve a content calendar at the start of each month, so there is no daily back-and-forth and no week with an empty feed. Every deliverable is listed in the quotation, which is why our prices are published rather than hidden.'],
          ar: ['الباقة هي عدد ثابت من التصاميم وعدد ثابت من قطع الموشن ومستوى محدد لإدارة المجتمع. تعتمد جدول المحتوى في بداية كل شهر، فلا مراسلات يومية ولا أسبوع بصفحة فارغة. كل تسليم مذكور في عرض السعر، ولهذا ننشر أسعارنا بدل إخفائها.'],
        },
        table: {
          head: [T('Package', 'الباقة'), T('Monthly from', 'شهرياً من'), T('Includes', 'تشمل')],
          rows: [
            [T('Starter', 'الأساسية'), '250', T('12 designs · 2 platforms · calendar · report', '١٢ تصميماً · منصتان · جدول محتوى · تقرير')],
            [T('Growth', 'النمو'), '600', T('24 designs · 4 Reels · 3 platforms + replies · paid ads', '٢٤ تصميماً · ٤ ريلز · ٣ منصات + ردود · حملات ممولة')],
            [T('Enterprise', 'المؤسسات'), '1,400', T('40 designs · 10 Reels · all platforms · media buying · account manager', '٤٠ تصميماً · ١٠ ريلز · كل المنصات · شراء إعلانات · مدير حساب')],
          ],
        },
      },
      {
        h2: T('Content, not filler', 'محتوى لا حشو'),
        body: {
          en: ['The calendar is built around what the account needs to sell this month: product launches, seasonal offers, proof from real customers, and behind-the-scenes work that builds trust. Photography and video direction are part of the plan — a design alone cannot carry a page that has no usable images.'],
          ar: ['يُبنى جدول المحتوى حول ما يحتاجه الحساب ليبيع هذا الشهر: إطلاق منتجات، عروض موسمية، شهادات عملاء حقيقيين، وكواليس عمل تبني الثقة. تصوير المنتجات وتوجيه الفيديو جزء من الخطة، فالتصميم وحده لا ينهض بصفحة تفتقد صوراً صالحة.'],
        },
        items: {
          en: ['Bilingual copywriting (Arabic and English)', 'Carousels, stories and static posts', 'Reels scripting, shooting direction and editing', 'Comment and DM replies inside working hours', 'Paid campaign setup, targeting and optimisation', 'Monthly report: reach, engagement, leads and spend'],
          ar: ['كتابة محتوى بلغتين (عربي وإنجليزي)', 'كاروسيل وستوريز وبوستات ثابتة', 'كتابة سكربت الريلز وتوجيه التصوير والمونتاج', 'الرد على التعليقات والرسائل خلال ساعات العمل', 'إعداد الحملات الممولة والاستهداف والتحسين', 'تقرير شهري: الوصول والتفاعل والعملاء والمصروف'],
        },
      },
      {
        h2: T('How we start', 'كيف نبدأ'),
        body: {
          en: ['We audit the existing accounts, review the last three months of insights, and agree one measurable objective for the first quarter — usually qualified enquiries rather than follower count. The first calendar goes out within five working days of signing, and the first report lands at day thirty.'],
          ar: ['نراجع الحسابات الحالية ونحلل بيانات آخر ثلاثة أشهر، ونتفق على هدف واحد قابل للقياس للربع الأول — عادةً استفسارات مؤهلة وليس عدد المتابعين. يُسلّم أول جدول محتوى خلال خمسة أيام عمل من التوقيع، ويصل أول تقرير في اليوم الثلاثين.'],
        },
      },
    ],
    faqs: [
      {
        q: T('How much does social media management cost in Jordan?', 'كم تكلفة إدارة السوشيال ميديا شهرياً في الأردن؟'),
        a: T('Packages start at 250 JOD per month for 12 designs on two platforms with a content calendar and a monthly report. A growth package with 24 designs, four Reels, three platforms and paid campaign management is 600 JOD, and a full enterprise retainer with media buying is 1,400 JOD.',
          'تبدأ الباقات من ٢٥٠ ديناراً شهرياً مقابل ١٢ تصميماً على منصتين مع جدول محتوى وتقرير شهري. باقة النمو التي تشمل ٢٤ تصميماً وأربعة ريلز وثلاث منصات وإدارة حملات ممولة بـ ٦٠٠ دينار، والباقة المتكاملة مع شراء الإعلانات بـ ١٤٠٠ دينار.'),
      },
      {
        q: T('Do you shoot photos and videos?', 'هل تقومون بالتصوير؟'),
        a: T('On-site photography and Reels shooting can be added to any package as a monthly shoot day in Amman. The package price covers design, motion and management; shooting days, models and paid actors are quoted separately so you are not paying for them when you do not need them.',
          'يمكن إضافة التصوير في الموقع وتصوير الريلز إلى أي باقة كيوم تصوير شهري داخل عمّان. سعر الباقة يغطي التصميم والموشن والإدارة، أما أيام التصوير والموديلات فتُسعّر منفصلة حتى لا تدفع مقابلها إن لم تحتجها.'),
      },
      {
        q: T('Who owns the accounts and the content?', 'لمن تعود ملكية الحسابات والمحتوى؟'),
        a: T('You do. The accounts stay in your name, our team is added as a partner with the minimum permissions needed, and every design and video file is handed over at the end of the month. If you leave, nothing has to be migrated or recovered.',
          'تعود لك. تبقى الحسابات باسمك، ويُضاف فريقنا كشريك بأقل صلاحيات ممكنة، وتُسلّم كل ملفات التصاميم والفيديو في نهاية الشهر. وإن أنهيت التعاون فلا شيء يحتاج إلى نقل أو استرجاع.'),
      },
    ],
  },
  {
    key: 'strategy',
    slug: 'marketing-consulting-jordan',
    serviceType: T('Marketing strategy and market research', 'الاستشارات التسويقية ودراسات السوق'),
    meta: {
      en: {
        title: 'Marketing Consulting & Market Research in Jordan | Art Space',
        desc: 'Market research, feasibility studies, competitor and SWOT analysis, buyer personas and go-to-market plans for companies entering or expanding in Jordan. Fixed-scope consulting from 300 JOD.',
        h1: 'Marketing Consulting, Research & Go-To-Market in Jordan',
        lede: 'Before you spend on advertising, find out whether the market wants the product. We run market research, feasibility studies, competitor analysis and go-to-market planning for companies launching or expanding in Jordan.',
      },
      ar: {
        title: 'استشارات تسويقية ودراسات سوق في الأردن | مساحة الفن',
        desc: 'دراسات سوق ودراسات جدوى وتحليل منافسين SWOT وبناء شخصيات العملاء واستراتيجية دخول السوق للشركات التي تؤسس أو تتوسع في الأردن. استشارات بنطاق ثابت تبدأ من ٣٠٠ دينار.',
        h1: 'استشارات تسويقية ودراسات سوق واستراتيجية دخول السوق في الأردن',
        lede: 'قبل أن تصرف على الإعلان، اعرف إن كان السوق يريد المنتج. ننفذ دراسات السوق ودراسات الجدوى وتحليل المنافسين وخطط الدخول للسوق للشركات التي تنطلق أو تتوسع في الأردن.',
      },
    },
    sections: [
      {
        h2: T('What we deliver', 'ما الذي نسلّمه'),
        body: {
          en: ['Each engagement ends with a document you can act on and a session to walk through it: the market size and how it was estimated, who the buyer actually is, what competitors charge and where they are weak, and the sequence of channels and messages for the first two quarters.'],
          ar: ['كل مشروع ينتهي بمستند قابل للتنفيذ وجلسة لشرحه: حجم السوق وكيف قُدّر، من هو المشتري فعلياً، ماذا يتقاضى المنافسون وأين نقاط ضعفهم، وتسلسل القنوات والرسائل للربعين الأولين.'],
        },
        table: {
          head: [T('Deliverable', 'المخرج'), T('From', 'يبدأ من')],
          rows: [
            [T('Market research & feasibility study', 'دراسة سوق ودراسة جدوى'), '450 JOD'],
            [T('Competitor & SWOT analysis', 'تحليل المنافسين و SWOT'), '300 JOD'],
            [T('Personas + go-to-market strategy', 'بناء الشخصيات واستراتيجية الدخول'), '550 JOD'],
            [T('360° campaign masterplan', 'خطة حملة ٣٦٠ متكاملة'), '900 JOD'],
          ],
        },
      },
      {
        h2: T('Who this is for', 'لمن هذه الخدمة'),
        body: {
          en: ['Founders validating a concept before committing to a lease, importers asking whether a product has a market here, and established companies whose growth stalled because they never defined who they are selling to. The work is the same in all three cases: replace assumptions with evidence, then build a plan on the evidence.'],
          ar: ['مؤسسون يريدون التحقق من فكرة قبل الالتزام بعقد إيجار، ومستوردون يسألون إن كان للمنتج سوق هنا، وشركات قائمة توقف نموها لأنها لم تحدد لمن تبيع. العمل واحد في الحالات الثلاث: استبدال الافتراضات بأدلة، ثم بناء خطة على تلك الأدلة.'],
        },
        items: {
          en: ['Desk research plus 10 to 20 buyer interviews', 'Pricing benchmark against real competitors', 'Positioning statement and message hierarchy', 'Channel plan with budget split and expected cost per lead', 'Quarter-by-quarter roadmap with owners'],
          ar: ['بحث مكتبي مع ١٠ إلى ٢٠ مقابلة مع مشترين', 'مقارنة أسعار مع منافسين حقيقيين', 'صياغة التموضع وتسلسل الرسائل', 'خطة قنوات مع توزيع الميزانية والكلفة المتوقعة للعميل المحتمل', 'خارطة طريق ربع سنوية بمسؤوليات محددة'],
        },
      },
    ],
    faqs: [
      {
        q: T('What is a feasibility study and do I need one?', 'ما هي دراسة الجدوى وهل أحتاجها؟'),
        a: T('A feasibility study tests whether a project can work before money is committed: demand, competition, capital requirement, operating cost and break-even. You need one when the decision involves a lease, equipment or stock that cannot be reversed cheaply — it is much cheaper than learning the same thing after opening.',
          'دراسة الجدوى تختبر إمكانية نجاح المشروع قبل الالتزام بالمال: الطلب والمنافسة وحجم رأس المال والتكاليف التشغيلية ونقطة التعادل. تحتاجها عندما يتضمن القرار عقاراً أو معدات أو بضاعة لا يمكن التراجع عنها بسهولة، فهي أرخص بكثير من تعلّم الدرس بعد الافتتاح.'),
      },
      {
        q: T('How long does market research take?', 'كم تستغرق دراسة السوق؟'),
        a: T('A competitor and SWOT study takes about two weeks. A full feasibility study with buyer interviews takes four to six weeks, because most of that time is fieldwork and interviews rather than writing.',
          'تحليل المنافسين و SWOT يستغرق نحو أسبوعين. دراسة الجدوى الكاملة مع مقابلات المشترين تستغرق من أربعة إلى ستة أسابيع، لأن معظم الوقت يذهب في العمل الميداني والمقابلات لا في الكتابة.'),
      },
    ],
  },
  {
    key: 'pricing',
    slug: 'signage-prices-jordan',
    serviceType: T('Signage pricing guide', 'دليل أسعار اللوحات الإعلانية'),
    meta: {
      en: {
        title: 'Signage Prices in Jordan — Per m² Rates & Instant Calculator',
        desc: 'What signage, facades, exhibition booths and printing cost in Jordan: published per-square-metre rates for flex, Alucobond, acrylic letters, glass branding and booth builds, plus a free instant calculator.',
        h1: 'Signage Prices in Jordan — Published Rates and Calculator',
        lede: 'Every rate we quote, in public: per square metre for flex, Alucobond, acrylic letters and glass branding, per piece for print, per square metre for booths — plus the add-ons that push a real quote above the base rate.',
      },
      ar: {
        title: 'أسعار اللوحات الإعلانية في الأردن — سعر المتر والحاسبة',
        desc: 'تكلفة اللوحات والواجهات وبوثات المعارض والمطبوعات في الأردن: أسعار معلنة للمتر المربع للفليكس والألكوبوند وحروف الأكريليك وتغليف الزجاج والبوثات، مع حاسبة فورية مجانية.',
        h1: 'أسعار اللوحات الإعلانية في الأردن — أسعار معلنة وحاسبة',
        lede: 'كل سعر نتعامل به معلن للعموم: سعر المتر المربع للفليكس والألكوبوند وحروف الأكريليك وتغليف الزجاج، وسعر القطعة للمطبوعات، وسعر المتر للبوثات — إضافة إلى الإضافات التي ترفع العرض الحقيقي فوق السعر الأساسي.',
      },
    },
    sections: [
      {
        h2: T('Base rates per square metre', 'الأسعار الأساسية للمتر المربع'),
        body: {
          en: ['These are base rates for the material and its fabrication. Lighting, structure, installation and design are separate line items, which is why two quotes for the same size can differ by a factor of three — one is a printed sheet, the other is a lit, framed, installed facade.'],
          ar: ['هذه أسعار أساسية للخامة وتصنيعها. الإضاءة والهيكل والتركيب والتصميم بنود منفصلة، ولهذا قد يختلف عرضان لنفس المقاس بثلاثة أضعاف: أحدهما ورقة مطبوعة والآخر واجهة مضاءة بهيكل وتركيب.'],
        },
        table: {
          head: [T('Item', 'البند'), T('From', 'من'), T('Realistic all-in', 'شامل التكلفة')],
          rows: [
            [T('Flex banner', 'بانر فليكس'), '6 JOD/m²', '10–14 JOD/m²'],
            [T('Flex lightbox', 'لوحة فليكس مضيئة'), '14 JOD/m²', '25–40 JOD/m²'],
            [T('Alucobond + acrylic letters', 'ألكوبوند + أكريليك'), '65 JOD/m²', '90–140 JOD/m²'],
            [T('Securit glass branding', 'تغليف زجاج سيكوريت'), '55 JOD/m²', '70–110 JOD/m²'],
            [T('Standard booth', 'بوث ستاندرد'), '90 JOD/m²', '110–160 JOD/m²'],
            [T('Custom booth', 'بوث مخصص'), '220 JOD/m²', '280–400 JOD/m²'],
          ],
        },
      },
      {
        h2: T('Add-ons that change the total', 'الإضافات التي تغيّر الإجمالي'),
        body: {
          en: ['Frame, lighting, installation and design are quoted per square metre or as a flat fee, and VAT of 16% is applied on top. The calculator on the home page applies exactly these values, so the result it shows is the number we would start a quotation from.'],
          ar: ['الشاسيه والإضاءة والتركيب والتصميم تُسعّر للمتر المربع أو كمبلغ مقطوع، وتُضاف ضريبة ١٦٪. الحاسبة في الصفحة الرئيسية تطبق هذه القيم نفسها، فالرقم الذي تظهره هو ما نبدأ منه عرض السعر.'],
        },
        table: {
          head: [T('Add-on', 'الإضافة'), T('Rate', 'السعر')],
          rows: [
            [T('Metal structure / frame', 'شاسيه حديد'), '12 JOD/m²'],
            [T('LED lighting', 'إضاءة LED'), '20 JOD/m²'],
            [T('Spotlights', 'سبوت لايت'), '9 JOD/m²'],
            [T('Installation & delivery', 'تركيب وتوصيل'), '6 JOD/m²'],
            [T('New design fee', 'أجور تصميم جديد'), '50 JOD flat'],
            [T('VAT', 'ضريبة المبيعات'), '16%'],
          ],
        },
      },
    ],
    faqs: [
      {
        q: T('Why do signage quotes vary so much?', 'لماذا تختلف عروض أسعار اللوحات بهذا القدر؟'),
        a: T('Because "signage" describes materials with a ten-fold price range. A printed flex sheet at 6 JOD per square metre and a lit Alucobond facade with acrylic letters at 65 JOD per square metre are both called signage. Always compare the same material, the same lighting and whether installation and VAT are included.',
          'لأن كلمة لوحات تصف خامات يبلغ فارق سعرها عشرة أضعاف. ورقة فليكس مطبوعة بـ ٦ دينارات للمتر وواجهة ألكوبوند مضاءة بحروف أكريليك بـ ٦٥ ديناراً للمتر تُسمّيان لوحات إعلانية. قارن دائماً الخامة نفسها والإضاءة نفسها، وتأكد إن كان التركيب والضريبة مشمولين.'),
      },
      {
        q: T('Can I get a price without a site visit?', 'هل أستطيع معرفة السعر دون معاينة؟'),
        a: T('Yes. Enter the width and height in the online calculator and it returns a full price with add-ons and VAT immediately. If the surface is irregular, high, or needs scaffolding and a permit, the site visit happens before we confirm the installation line — the material cost does not change.',
          'نعم. أدخل العرض والارتفاع في الحاسبة الإلكترونية لتحصل على سعر كامل مع الإضافات والضريبة فوراً. أما إذا كان السطح غير منتظم أو مرتفعاً أو يحتاج سقالات وترخيصاً، فتُجرى المعاينة قبل تثبيت بند التركيب، ولا تتغير كلفة الخامة.'),
      },
    ],
  },
];

const bySlug = new Map(SERVICES.map((s) => [s.slug, s]));
const byKey = new Map(SERVICES.map((s) => [s.key, s]));
const serviceBySlug = (slug) => bySlug.get(slug) || null;

/* ------------------------------------------------------------------ *
 * Site chrome
 * ------------------------------------------------------------------ */
const CSS = `
:root{--ink:#141311;--ink-2:#1b1a18;--cream:#FBF7F1;--cream-2:#F4EBE0;--line:rgba(24,21,18,.13);
--fg:#161412;--muted:#5c554d;--gold:#C9A45C;--gold-ink:#7A5A18;--terra:#CB6B47}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--cream);color:var(--fg);
font-family:'Inter Tight','IBM Plex Sans Arabic',system-ui,-apple-system,'Segoe UI',sans-serif;
line-height:1.65;-webkit-font-smoothing:antialiased}
[dir=rtl] body{font-family:'IBM Plex Sans Arabic','Inter Tight',system-ui,sans-serif;line-height:1.9}
a{color:inherit;text-decoration:none}
img{max-width:100%;height:auto}
.wrap{max-width:74rem;margin:0 auto;padding:0 1.25rem}
.skip{position:absolute;inset-inline-start:-9999px;background:var(--ink);color:var(--cream);padding:.6rem 1rem;z-index:9}
.skip:focus{inset-inline-start:1rem;top:1rem}
header.site{position:sticky;top:0;z-index:5;background:rgba(20,19,17,.94);color:var(--cream);
border-bottom:1px solid rgba(255,255,255,.1);backdrop-filter:blur(12px)}
header.site .bar{display:flex;align-items:center;justify-content:space-between;gap:1rem;min-height:64px}
.brand{display:flex;align-items:baseline;gap:.55rem;font-weight:800;letter-spacing:-.01em;font-size:1.05rem}
.brand span{color:var(--gold);font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;font-weight:600}
header.site nav{display:flex;gap:1.1rem;font-size:.78rem;letter-spacing:.1em;text-transform:uppercase}
header.site nav a{color:rgba(240,228,214,.72)}
header.site nav a:hover,header.site nav a[aria-current]{color:var(--gold)}
.tel{border:1px solid rgba(201,164,92,.5);color:var(--gold);border-radius:999px;padding:.45rem .9rem;
font-size:.78rem;font-variant-numeric:tabular-nums;white-space:nowrap}
.crumbs{font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:1.4rem 0 .3rem}
.crumbs a:hover{color:var(--gold-ink)}
.crumbs span{margin:0 .5rem;opacity:.5}
h1{font-size:clamp(1.85rem,4.6vw,3.1rem);line-height:1.14;letter-spacing:-.028em;margin:.35rem 0 .9rem;font-weight:800}
.lede{font-size:1.02rem;max-width:46rem;color:var(--muted)}
main section{padding:2.6rem 0;border-top:1px solid var(--line)}
main section:first-of-type{border-top:0}
h2{font-size:clamp(1.2rem,2.6vw,1.6rem);line-height:1.3;letter-spacing:-.015em;margin:0 0 .9rem}
h3{font-size:1rem;margin:1.6rem 0 .4rem}
p{margin:0 0 1rem;max-width:46rem;color:var(--muted)}
ul.ticks{list-style:none;padding:0;margin:1rem 0 0;display:grid;gap:.6rem;
grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr))}
ul.ticks li{position:relative;padding-inline-start:1.4rem;font-size:.94rem}
ul.ticks li::before{content:'';position:absolute;inset-inline-start:0;top:.62em;width:.45rem;height:.45rem;
border-radius:50%;background:var(--gold)}
.cta{display:flex;flex-wrap:wrap;gap:.6rem;margin:1.5rem 0 .4rem}
.btn{display:inline-flex;align-items:center;gap:.45rem;min-height:2.9rem;padding:0 1.25rem;border-radius:999px;
font-weight:700;font-size:.88rem;border:1px solid transparent}
.btn-solid{background:var(--gold);color:var(--ink)}
.btn-solid:hover{background:#E0C48A}
.btn-line{border-color:rgba(24,21,18,.22);color:var(--fg)}
.btn-line:hover{border-color:var(--gold)}
table{width:100%;border-collapse:collapse;margin:1.2rem 0;font-size:.9rem}
caption{text-align:start;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding-bottom:.5rem}
th,td{text-align:start;padding:.7rem .6rem;border-bottom:1px solid var(--line)}
th{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700}
td:last-child,th:last-child{white-space:nowrap;font-variant-numeric:tabular-nums}
tbody tr:last-child td{border-bottom:0}
details.faq{border-top:1px solid var(--line);padding:.9rem 0}
details.faq summary{cursor:pointer;font-weight:700;font-size:.98rem;list-style:none;display:flex;
justify-content:space-between;gap:1rem;align-items:center}
details.faq summary::-webkit-details-marker{display:none}
details.faq summary::after{content:'+';color:var(--gold);font-size:1.2rem;line-height:1}
details.faq[open] summary::after{content:'–'}
details.faq p{margin:.7rem 0 0;font-size:.94rem}
.band{background:var(--ink);color:var(--cream);padding:2.6rem 0;margin-top:2rem}
.band p{color:rgba(240,228,214,.62)}
.band .btn-line{border-color:rgba(255,255,255,.25);color:var(--cream)}
.links{display:grid;gap:.5rem 1.6rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr));
font-size:.9rem;margin:0;padding:0;list-style:none}
.links a{color:rgba(240,228,214,.72)}
.links a:hover{color:var(--gold)}
footer.site{background:var(--ink-2);color:var(--cream);padding:2.4rem 0 2rem;font-size:.88rem}
footer.site h2{font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(240,228,214,.45);margin:0 0 .7rem}
footer.site a{color:rgba(240,228,214,.75)}
footer.site a:hover{color:var(--gold)}
footer.site address{font-style:normal;display:grid;gap:.4rem;color:rgba(240,228,214,.75)}
.cols{display:grid;gap:2rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))}
.legal{margin-top:2rem;padding-top:1.1rem;border-top:1px solid rgba(255,255,255,.1);
color:rgba(240,228,214,.4);font-size:.75rem;display:flex;flex-wrap:wrap;gap:.6rem;justify-content:space-between}
.gold{color:var(--gold-ink)}
@media(max-width:720px){header.site nav{display:none}.bar{gap:.5rem}}
`;

const navLinks = (lang, active) => SERVICES.filter((s) => s.key !== 'pricing').map((s) => {
  const label = s.nav || pick({
    signage: T('Signage', 'آرمات'), booths: T('Booths', 'معارض'),
    printing: T('Printing', 'مطبوعات'), social: T('Social', 'سوشيال'), strategy: T('Strategy', 'استشارات'),
  }[s.key], lang);
  return `<a href="/${lang}/${s.slug}"${s.key === active ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
}).join('');

const header = (lang, active, phone) => `
<header class="site"><div class="wrap bar">
  <a class="brand" href="/">Art Space <span>${lang === 'ar' ? 'مساحة الفن' : 'Amman'}</span></a>
  <nav aria-label="${lang === 'ar' ? 'التنقل الرئيسي' : 'Primary'}">${navLinks(lang, active)}</nav>
  <a class="tel" href="tel:${esc(String(phone || '').replace(/\s/g, ''))}" dir="ltr">${esc(phone || '')}</a>
</div></header>`;

const footer = (lang, company) => {
  const name = pick(company.name, lang, pick(BRAND, lang));
  const addr = pick(company.address, lang, lang === 'ar' ? 'عمّان، الأردن' : 'Amman, Jordan');
  const services = SERVICES.map((s) => `<li><a href="/${lang}/${s.slug}">${esc(pick(s.meta[lang].h1, lang))}</a></li>`).join('');
  return `
<footer class="site"><div class="wrap">
  <div class="cols">
    <div>
      <h2>${lang === 'ar' ? 'الخدمات' : 'Services'}</h2>
      <ul class="links">${services}</ul>
    </div>
    <div>
      <h2>${lang === 'ar' ? 'التواصل' : 'Contact'}</h2>
      <address>
        <span>${esc(addr)}</span>
        <a href="tel:${esc(String(company.phone || '').replace(/\s/g, ''))}" dir="ltr">${esc(company.phone || '')}</a>
        <a href="mailto:${esc(company.email || '')}" dir="ltr">${esc(company.email || '')}</a>
      </address>
    </div>
    <div>
      <h2>${lang === 'ar' ? 'الأسعار والعروض' : 'Pricing & quotes'}</h2>
      <ul class="links">
        <li><a href="/#calculator">${lang === 'ar' ? 'حاسبة الأسعار الفورية' : 'Instant price calculator'}</a></li>
        <li><a href="/${lang}/signage-prices-jordan">${lang === 'ar' ? 'دليل الأسعار المعلنة' : 'Published price guide'}</a></li>
        <li><a href="/llms.txt">llms.txt</a></li>
      </ul>
    </div>
  </div>
  <div class="legal">
    <span>© ${new Date().getFullYear()} ${esc(name)} — ${lang === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</span>
    <span dir="ltr">Art Space · Amman, Jordan</span>
  </div>
</div></footer>`;
};

/* ------------------------------------------------------------------ *
 * Structured data
 * ------------------------------------------------------------------ */
function orgNode(base, company, city) {
  const name = pick(company.name, 'en', pick(BRAND, 'en'));
  const nameAr = pick(company.name, 'ar', pick(BRAND, 'ar'));
  const logo = company.logo ? (company.logo.startsWith('http') ? company.logo : base + company.logo) : `${base}/og-image.png`;
  return {
    '@type': ['ProfessionalService', 'LocalBusiness'],
    '@id': `${base}/#organization`,
    name,
    alternateName: nameAr,
    legalName: pick(LEGAL, 'en'),
    url: `${base}/`,
    logo: { '@type': 'ImageObject', url: logo, width: 1200, height: 630 },
    image: logo,
    description: 'Signage, facades, exhibition booths, printing, social media and marketing strategy in Amman, Jordan.',
    telephone: company.phone || undefined,
    email: company.email || undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city || 'Amman',
      addressRegion: 'Amman Governorate',
      addressCountry: 'JO',
    },
    areaServed: CITIES.map((c) => ({ '@type': 'City', name: c })),
    currenciesAccepted: 'JOD',
    priceRange: '$$',
    knowsLanguage: ['ar', 'en'],
    foundingDate: '2013',
    slogan: pick(company.tagline, 'en'),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Advertising, signage and marketing services',
      itemListElement: SERVICES.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: pick(s.meta.en.h1, 'en'), serviceType: pick(s.serviceType, 'en'), url: `${base}/en/${s.slug}` },
      })),
    },
  };
}

function websiteNode(base) {
  return {
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    url: `${base}/`,
    name: 'Art Space',
    alternateName: 'مساحة الفن',
    inLanguage: ['ar', 'en'],
    publisher: { '@id': `${base}/#organization` },
  };
}

function servicePageGraph({ base, lang, svc, company }) {
  const url = `${base}/${lang}/${svc.slug}`;
  const meta = svc.meta[lang];
  /* Price rows rendered on the page, reused verbatim as an AggregateOffer so the schema can
     never quote a number a human cannot see. Rows without a parseable figure are skipped. */
  const prices = svc.sections
    .flatMap((s) => (s.table && s.table.rows) || [])
    .map((r) => parseFloat(String(r[1] == null ? '' : r[1]).replace(/[^0-9.]/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 100000);
  const offers = prices.length >= 2 ? {
    '@type': 'AggregateOffer',
    '@id': `${url}#offers`,
    priceCurrency: 'JOD',
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    offerCount: prices.length,
    availability: 'https://schema.org/InStock',
    url,
    seller: { '@id': `${base}/#organization` },
  } : undefined;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      orgNode(base, company),
      websiteNode(base),
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: meta.title,
        description: meta.desc,
        inLanguage: lang === 'ar' ? 'ar-JO' : 'en-JO',
        isPartOf: { '@id': `${base}/#website` },
        about: { '@id': `${base}/#organization` },
        primaryImageOfPage: { '@id': `${base}/#primaryimage` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        dateModified: new Date().toISOString().slice(0, 10),
      },
      {
        '@type': 'ImageObject',
        '@id': `${base}/#primaryimage`,
        url: `${base}/og-image.png`,
        width: 1200,
        height: 630,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: pick(T('Home', 'الرئيسية'), lang), item: `${base}/` },
          { '@type': 'ListItem', position: 2, name: meta.h1, item: url },
        ],
      },
      {
        '@type': 'Service',
        '@id': `${url}#service`,
        name: meta.h1,
        serviceType: pick(svc.serviceType, lang),
        description: meta.desc,
        provider: { '@id': `${base}/#organization` },
        areaServed: CITIES.map((c) => ({ '@type': 'City', name: c })),
        availableLanguage: ['ar', 'en'],
        url,
        offers,
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: svc.faqs.map((f) => ({
          '@type': 'Question',
          name: pick(f.q, lang),
          acceptedAnswer: { '@type': 'Answer', text: pick(f.a, lang) },
        })),
      },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Landing page renderer
 * ------------------------------------------------------------------ */
function renderServicePage({ base, lang, svc, company }) {
  const meta = svc.meta[lang];
  const other = lang === 'ar' ? 'en' : 'ar';
  const url = `${base}/${lang}/${svc.slug}`;
  const alt = `${base}/${other}/${svc.slug}`;
  const home = `${base}/`;
  const t = (en, ar) => (lang === 'ar' ? ar : en);
  const jsonld = JSON.stringify(servicePageGraph({ base, lang, svc, company })).replace(/</g, '\\u003c');

  const sections = svc.sections.map((s, i) => {
    const body = (s.body?.[lang] || []).map((p) => `<p>${esc(p)}</p>`).join('');
    const items = s.items?.[lang];
    const list = items ? `<ul class="ticks">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    const table = s.table ? `<table>
      <caption>${esc(t('Indicative rates — VAT excluded', 'أسعار استرشادية — لا تشمل الضريبة'))}</caption>
      <thead><tr>${s.table.head.map((h) => `<th scope="col">${esc(pick(h, lang))}</th>`).join('')}</tr></thead>
      <tbody>${s.table.rows.map((r) => `<tr>${r.map((c, ci) => (ci === 0 ? `<th scope="row" style="font-weight:600;letter-spacing:0;text-transform:none;color:var(--fg);font-size:.9rem">${esc(pick(c, lang))}</th>` : `<td>${esc(pick(c, lang))}</td>`)).join('')}</tr>`).join('')}</tbody>
    </table>` : '';
    return `<section aria-labelledby="s${i}"><h2 id="s${i}">${esc(pick(s.h2, lang))}</h2>${body}${list}${table}</section>`;
  }).join('\n');

  const faqs = `<section aria-labelledby="faq">
    <h2 id="faq">${esc(t('Frequently asked questions', 'الأسئلة الشائعة'))}</h2>
    ${svc.faqs.map((f) => `<details class="faq"><summary>${esc(pick(f.q, lang))}</summary><p>${esc(pick(f.a, lang))}</p></details>`).join('')}
  </section>`;

  const siblings = SERVICES.filter((s) => s.key !== svc.key).map((s) => {
    const label = pick({ signage: T('Signage & facades', 'آرمات وواجهات'), booths: T('Exhibition booths', 'بوثات معارض'), printing: T('Printing', 'مطبوعات'), social: T('Social media management', 'إدارة سوشيال ميديا'), strategy: T('Marketing consulting', 'استشارات تسويقية'), pricing: T('Signage price guide', 'دليل الأسعار') }[s.key], lang);
    return `<li><a href="/${lang}/${s.slug}">${esc(label)}</a></li>`;
  }).join('');

  return `<!doctype html>
<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.desc)}" />
<link rel="canonical" href="${url}" />
<link rel="alternate" hreflang="ar" href="${base}/ar/${svc.slug}" />
<link rel="alternate" hreflang="en" href="${base}/en/${svc.slug}" />
<link rel="alternate" hreflang="x-default" href="${home}" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${esc(pick(BRAND, lang))}" />
<meta property="og:locale" content="${lang === 'ar' ? 'ar_JO' : 'en_US'}" />
<meta property="og:locale:alternate" content="${lang === 'ar' ? 'en_US' : 'ar_JO'}" />
<meta property="og:title" content="${esc(meta.title)}" />
<meta property="og:description" content="${esc(meta.desc)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${base}/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(meta.title)}" />
<meta name="twitter:description" content="${esc(meta.desc)}" />
<meta name="twitter:image" content="${base}/og-image.png" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;800&family=Inter+Tight:wght@400;600;800&display=swap" media="print" onload="this.media='all'" />
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;800&family=Inter+Tight:wght@400;600;800&display=swap" /></noscript>
<style>${CSS}</style>
<script type="application/ld+json">${jsonld}</script>
</head>
<body>
<a class="skip" href="#main">${esc(t('Skip to content', 'تجاوز إلى المحتوى'))}</a>
${header(lang, svc.key, company.phone)}
<div class="wrap">
  <nav class="crumbs" aria-label="${esc(t('Breadcrumb', 'مسار التنقل'))}">
    <a href="/">${esc(t('Home', 'الرئيسية'))}</a><span aria-hidden="true">›</span>
    <span aria-current="page" style="opacity:1">${esc(svc.meta[lang].h1)}</span>
  </nav>
  <main id="main">
    <h1>${esc(meta.h1)}</h1>
    <p class="lede">${esc(meta.lede)}</p>
    <div class="cta">
      <a class="btn btn-solid" href="/#calculator">${esc(t('Price my project', 'احسب سعر مشروعي'))}</a>
      <a class="btn btn-line" href="tel:${esc(String(company.phone || '').replace(/\s/g, ''))}" dir="ltr">${esc(company.phone || '')}</a>
      <a class="btn btn-line" href="${alt}" hreflang="${other}" lang="${other}">${esc(other === 'ar' ? 'العربية' : 'English')}</a>
    </div>
    ${sections}
    ${faqs}
  </main>
  <section class="band" aria-labelledby="next" style="border:0">
    <div class="wrap" style="padding:0">
      <h2 id="next" style="color:var(--cream)">${esc(t('Related services', 'خدمات مرتبطة'))}</h2>
      <ul class="links">${siblings}</ul>
    </div>
  </section>
</div>
${footer(lang, company)}
</body>
</html>`;
}

/* ------------------------------------------------------------------ *
 * Crawl governance files
 * ------------------------------------------------------------------ */
const robotsTxt = (base) => `# Art Space — public marketing pages are open; the admin panel and the API are not.
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

# Answer-engine crawlers that produce citations when allowed.
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Applebot
Allow: /

# Model-training crawler — allowed deliberately; the copy is public marketing.
User-agent: Google-Extended
Allow: /

Sitemap: ${base}/sitemap.xml
`;

function sitemapXml(base) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const url = (loc, priority, changefreq, alternates) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${alternates}  </url>`;

  const pairs = SERVICES.flatMap((s) => {
    const alts = [
      `    <xhtml:link rel="alternate" hreflang="ar" href="${base}/ar/${s.slug}" />`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${base}/en/${s.slug}" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}/" />`,
    ].join('\n') + '\n';
    return [
      url(`${base}/ar/${s.slug}`, '0.8', 'monthly', alts),
      url(`${base}/en/${s.slug}`, '0.8', 'monthly', alts),
    ];
  });

  const home = url(`${base}/`, '1.0', 'weekly', [
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}/" />`,
    `    <xhtml:link rel="alternate" hreflang="ar" href="${base}/" />`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${base}/" />`,
  ].join('\n') + '\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${home}
${pairs.join('\n')}
</urlset>
`;
}

/** llms.txt — the agent-facing map: who we are, what we sell, where, and what it costs. */
function llmsTxt(base, company) {
  const lang = 'en';
  return `# Art Space (مساحة الفن)

> Full-service advertising, signage, printing and marketing company in Amman, Jordan.
> Signage and facades, exhibition booths, offset and digital printing, social media
> management and marketing research — designed, fabricated and installed in-house
> from our own workshop since 2013, across 850+ projects. Prices are published and
> a public calculator quotes signage and print instantly.

## Contact
- Phone: ${company.phone || '+962 7 8616 5737'}
${company.email ? `- Email: ${company.email}` : ''}
- Location: ${pick(company.address, 'en', 'Amman, Jordan')}
- Serves: ${CITIES.join(', ')}, and all of Jordan (${CITIES_AR.join('، ')})
- Languages: Arabic, English
- Currency: JOD (Jordanian dinar), prices exclude 16% VAT unless stated

## Services (English)
${SERVICES.map((s) => `- [${pick(s.meta.en.h1, lang)}](${base}/en/${s.slug}): ${pick(s.meta.en.lede, lang)}`).join('\n')}

## Services (Arabic)
${SERVICES.map((s) => `- [${pick(s.meta.ar.h1, 'ar')}](${base}/ar/${s.slug}): ${pick(s.meta.ar.lede, 'ar')}`).join('\n')}

## Published rates (starting points, JOD)
- Flex banner: 6 per m²; illuminated flex lightbox: 14 per m²
- Alucobond facade + 3D acrylic letters: 65 per m²
- Securit glass branding: 55 per m²
- Metal frame +12 per m², LED lighting +20 per m², installation +6 per m², new design 50 flat
- Standard exhibition booth: 90 per m²; custom booth: 220 per m²
- Business cards from 0.24 per piece; flyers 0.12; brochures 0.65; NCR books 2.40
- Social media packages: 250 / 600 / 1,400 per month
- Marketing research: feasibility study 450, competitor + SWOT 300, GTM strategy 550, 360 campaign plan 900

## Key facts for answers
- Typical shop sign: 5–10 working days; facade projects longer.
- Custom exhibition booth: 3–4 weeks from approved design; standard booth 7–10 days.
- Signage is measured on site free inside Amman; a quote can be produced from the
  online calculator without a visit when the surface is regular.
- The instant calculator at ${base}/#calculator applies the same rates listed above.

## Site map
- [Home and instant calculator](${base}/)
- [Signage prices in Jordan](${base}/en/signage-prices-jordan)
- [Exhibition booth design and build](${base}/en/exhibition-booths-jordan)
- [Printing in Amman](${base}/en/printing-amman)
- [Social media management](${base}/en/social-media-management-amman)
- [Marketing consulting and research](${base}/en/marketing-consulting-jordan)
- [Signage company in Amman](${base}/en/signage-amman)
`;
}

/** Head block for the SPA at `/` — richer than the old single LocalBusiness node. */
function homeHead(base, company) {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      orgNode(base, company),
      websiteNode(base),
      {
        '@type': 'WebPage',
        '@id': `${base}/#webpage`,
        url: `${base}/`,
        name: 'Art Space — Signage, Printing, Social Media & Marketing in Jordan',
        inLanguage: ['ar-JO', 'en-JO'],
        isPartOf: { '@id': `${base}/#website` },
        about: { '@id': `${base}/#organization` },
      },
    ],
  };
  return [
    `<link rel="canonical" href="${base}/" />`,
    `<link rel="alternate" hreflang="ar" href="${base}/" />`,
    `<link rel="alternate" hreflang="en" href="${base}/" />`,
    `<link rel="alternate" hreflang="x-default" href="${base}/" />`,
    `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`,
  ].join('');
}

export {
  SERVICES,
  serviceBySlug,
  byKey as serviceByKey,
  renderServicePage,
  robotsTxt,
  sitemapXml,
  llmsTxt,
  homeHead,
};
