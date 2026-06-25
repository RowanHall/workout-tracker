export type LocaleCode =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt'
  | 'it'
  | 'ja'
  | 'zh'
  | 'ko'
  | 'ru'
  | 'ar'
  | 'hi';

export const DEFAULT_LOCALE: LocaleCode = 'en';

export interface LocaleMeta {
  code: LocaleCode;
  /** Native name as it appears in the language list. */
  name: string;
  /** English name shown as a secondary label. */
  english: string;
}

export const LOCALES: LocaleMeta[] = [
  { code: 'en', name: 'English', english: 'English' },
  { code: 'es', name: 'Español', english: 'Spanish' },
  { code: 'fr', name: 'Français', english: 'French' },
  { code: 'de', name: 'Deutsch', english: 'German' },
  { code: 'pt', name: 'Português', english: 'Portuguese' },
  { code: 'it', name: 'Italiano', english: 'Italian' },
  { code: 'ja', name: '日本語', english: 'Japanese' },
  { code: 'zh', name: '中文', english: 'Chinese (Simplified)' },
  { code: 'ko', name: '한국어', english: 'Korean' },
  { code: 'ru', name: 'Русский', english: 'Russian' },
  { code: 'ar', name: 'العربية', english: 'Arabic' },
  { code: 'hi', name: 'हिन्दी', english: 'Hindi' },
];

// Translation keys are flat dotted strings. English is the source of truth —
// any key missing from a locale falls back to the English copy.
const en = {
  'common.on': 'On',
  'common.off': 'Off',
  'common.free': 'Free',
  'common.notSet': 'Not set',
  'common.cancel': 'Cancel',
  'common.openSettings': 'Open Settings',
  'common.unlock': 'Unlock',

  'settings.title': 'Settings',
  'settings.section.account': 'Account',
  'settings.section.preferences': 'Preferences',
  'settings.section.data': 'Data',

  'settings.row.profile': 'Profile',
  'settings.row.account': 'Account',
  'settings.row.membership': 'Manage membership',
  'settings.row.notifications': 'Notifications',
  'settings.row.bodyWeight': 'Body weight',
  'settings.row.language': 'Language',
  'settings.row.export': 'Export workouts',
  'settings.row.exportPreparing': 'Preparing your file…',

  'settings.export.failedTitle': 'Export failed',
  'settings.export.failedFallback': 'Please try again.',

  'language.title': 'Language',
  'language.intro':
    'Choose the language used across Kova. New text will appear in your selected language right away.',

  'notifications.title': 'Notifications',
  'notifications.streak.label': 'Streak reminders',
  'notifications.streak.descOn': "Local nudges so you don't break your streak.",
  'notifications.streak.descOff': 'Enable to get streak nudges.',
  'notifications.permission.title': 'Notifications disabled',
  'notifications.permission.body':
    'Enable notifications for Kova in your device Settings to get streak reminders.',
  'notifications.intensity.label': 'How pushy?',
  'notifications.intensity.gentle': 'gentle',
  'notifications.intensity.balanced': 'balanced',
  'notifications.intensity.pushy': 'pushy',
  'notifications.intensity.gentleDesc':
    'Only when your streak is at risk, plus milestones and comebacks.',
  'notifications.intensity.balancedDesc':
    'Adds a workout nudge on Mon / Wed / Fri.',
  'notifications.intensity.pushyDesc':
    "Daily workout nudge on days you haven't trained.",
  'notifications.time.label': 'Reminder time',
};

export type TranslationKey = keyof typeof en;

type Dictionary = Partial<Record<TranslationKey, string>>;

const es: Dictionary = {
  'common.on': 'Activado',
  'common.off': 'Desactivado',
  'common.free': 'Gratis',
  'common.notSet': 'Sin definir',
  'common.cancel': 'Cancelar',
  'common.openSettings': 'Abrir ajustes',
  'common.unlock': 'Desbloquear',
  'settings.title': 'Ajustes',
  'settings.section.account': 'Cuenta',
  'settings.section.preferences': 'Preferencias',
  'settings.section.data': 'Datos',
  'settings.row.profile': 'Perfil',
  'settings.row.account': 'Cuenta',
  'settings.row.membership': 'Gestionar suscripción',
  'settings.row.notifications': 'Notificaciones',
  'settings.row.bodyWeight': 'Peso corporal',
  'settings.row.language': 'Idioma',
  'settings.row.export': 'Exportar entrenamientos',
  'settings.row.exportPreparing': 'Preparando tu archivo…',
  'settings.export.failedTitle': 'Error al exportar',
  'settings.export.failedFallback': 'Inténtalo de nuevo.',
  'language.title': 'Idioma',
  'language.intro':
    'Elige el idioma que se usará en Kova. El texto nuevo aparecerá en tu idioma de inmediato.',
  'notifications.title': 'Notificaciones',
  'notifications.streak.label': 'Recordatorios de racha',
  'notifications.streak.descOn': 'Avisos locales para que no rompas tu racha.',
  'notifications.streak.descOff': 'Actívalas para recibir avisos de racha.',
  'notifications.permission.title': 'Notificaciones desactivadas',
  'notifications.permission.body':
    'Activa las notificaciones de Kova en los ajustes del dispositivo para recibir recordatorios.',
  'notifications.intensity.label': '¿Cuánta insistencia?',
  'notifications.intensity.gentle': 'suave',
  'notifications.intensity.balanced': 'equilibrado',
  'notifications.intensity.pushy': 'insistente',
  'notifications.intensity.gentleDesc':
    'Solo cuando tu racha está en riesgo, más hitos y regresos.',
  'notifications.intensity.balancedDesc':
    'Añade un aviso de entrenamiento los lunes, miércoles y viernes.',
  'notifications.intensity.pushyDesc':
    'Aviso diario los días que no hayas entrenado.',
  'notifications.time.label': 'Hora del recordatorio',
};

const fr: Dictionary = {
  'common.on': 'Activé',
  'common.off': 'Désactivé',
  'common.free': 'Gratuit',
  'common.notSet': 'Non défini',
  'common.cancel': 'Annuler',
  'common.openSettings': 'Ouvrir les réglages',
  'common.unlock': 'Débloquer',
  'settings.title': 'Réglages',
  'settings.section.account': 'Compte',
  'settings.section.preferences': 'Préférences',
  'settings.section.data': 'Données',
  'settings.row.profile': 'Profil',
  'settings.row.account': 'Compte',
  'settings.row.membership': 'Gérer l’abonnement',
  'settings.row.notifications': 'Notifications',
  'settings.row.bodyWeight': 'Poids corporel',
  'settings.row.language': 'Langue',
  'settings.row.export': 'Exporter les entraînements',
  'settings.row.exportPreparing': 'Préparation du fichier…',
  'settings.export.failedTitle': 'Échec de l’export',
  'settings.export.failedFallback': 'Veuillez réessayer.',
  'language.title': 'Langue',
  'language.intro':
    'Choisissez la langue utilisée dans Kova. Les nouveaux textes s’afficheront immédiatement dans cette langue.',
  'notifications.title': 'Notifications',
  'notifications.streak.label': 'Rappels de série',
  'notifications.streak.descOn':
    'Notifications locales pour ne pas casser votre série.',
  'notifications.streak.descOff': 'Activez pour recevoir des rappels de série.',
  'notifications.permission.title': 'Notifications désactivées',
  'notifications.permission.body':
    'Activez les notifications de Kova dans les réglages pour recevoir les rappels.',
  'notifications.intensity.label': 'Quelle intensité ?',
  'notifications.intensity.gentle': 'doux',
  'notifications.intensity.balanced': 'équilibré',
  'notifications.intensity.pushy': 'insistant',
  'notifications.intensity.gentleDesc':
    'Uniquement quand votre série est en danger, plus jalons et retours.',
  'notifications.intensity.balancedDesc':
    'Ajoute un rappel d’entraînement lundi, mercredi et vendredi.',
  'notifications.intensity.pushyDesc':
    'Rappel quotidien les jours où vous ne vous êtes pas entraîné.',
  'notifications.time.label': 'Heure du rappel',
};

const de: Dictionary = {
  'common.on': 'An',
  'common.off': 'Aus',
  'common.free': 'Kostenlos',
  'common.notSet': 'Nicht gesetzt',
  'common.cancel': 'Abbrechen',
  'common.openSettings': 'Einstellungen öffnen',
  'common.unlock': 'Freischalten',
  'settings.title': 'Einstellungen',
  'settings.section.account': 'Konto',
  'settings.section.preferences': 'Einstellungen',
  'settings.section.data': 'Daten',
  'settings.row.profile': 'Profil',
  'settings.row.account': 'Konto',
  'settings.row.membership': 'Mitgliedschaft verwalten',
  'settings.row.notifications': 'Benachrichtigungen',
  'settings.row.bodyWeight': 'Körpergewicht',
  'settings.row.language': 'Sprache',
  'settings.row.export': 'Workouts exportieren',
  'settings.row.exportPreparing': 'Datei wird vorbereitet…',
  'settings.export.failedTitle': 'Export fehlgeschlagen',
  'settings.export.failedFallback': 'Bitte erneut versuchen.',
  'language.title': 'Sprache',
  'language.intro':
    'Wähle die Sprache für Kova. Neue Texte erscheinen sofort in der gewählten Sprache.',
  'notifications.title': 'Benachrichtigungen',
  'notifications.streak.label': 'Serien-Erinnerungen',
  'notifications.streak.descOn':
    'Lokale Hinweise, damit deine Serie nicht reißt.',
  'notifications.streak.descOff':
    'Aktivieren, um Serien-Hinweise zu erhalten.',
  'notifications.permission.title': 'Benachrichtigungen deaktiviert',
  'notifications.permission.body':
    'Aktiviere Benachrichtigungen für Kova in den Geräteeinstellungen, um Erinnerungen zu erhalten.',
  'notifications.intensity.label': 'Wie eindringlich?',
  'notifications.intensity.gentle': 'sanft',
  'notifications.intensity.balanced': 'ausgewogen',
  'notifications.intensity.pushy': 'forsch',
  'notifications.intensity.gentleDesc':
    'Nur wenn deine Serie gefährdet ist, plus Meilensteine und Comebacks.',
  'notifications.intensity.balancedDesc':
    'Zusätzlich ein Workout-Hinweis Mo / Mi / Fr.',
  'notifications.intensity.pushyDesc':
    'Tägliche Workout-Erinnerung an Tagen ohne Training.',
  'notifications.time.label': 'Erinnerungszeit',
};

const pt: Dictionary = {
  'common.on': 'Ativado',
  'common.off': 'Desativado',
  'common.free': 'Grátis',
  'common.notSet': 'Não definido',
  'common.cancel': 'Cancelar',
  'common.openSettings': 'Abrir Ajustes',
  'common.unlock': 'Desbloquear',
  'settings.title': 'Ajustes',
  'settings.section.account': 'Conta',
  'settings.section.preferences': 'Preferências',
  'settings.section.data': 'Dados',
  'settings.row.profile': 'Perfil',
  'settings.row.account': 'Conta',
  'settings.row.membership': 'Gerenciar assinatura',
  'settings.row.notifications': 'Notificações',
  'settings.row.bodyWeight': 'Peso corporal',
  'settings.row.language': 'Idioma',
  'settings.row.export': 'Exportar treinos',
  'settings.row.exportPreparing': 'Preparando seu arquivo…',
  'settings.export.failedTitle': 'Falha na exportação',
  'settings.export.failedFallback': 'Tente novamente.',
  'language.title': 'Idioma',
  'language.intro':
    'Escolha o idioma usado no Kova. Os textos novos aparecerão no idioma escolhido imediatamente.',
  'notifications.title': 'Notificações',
  'notifications.streak.label': 'Lembretes de sequência',
  'notifications.streak.descOn':
    'Avisos locais para você não quebrar sua sequência.',
  'notifications.streak.descOff': 'Ative para receber avisos de sequência.',
  'notifications.permission.title': 'Notificações desativadas',
  'notifications.permission.body':
    'Ative as notificações do Kova nos Ajustes para receber lembretes.',
  'notifications.intensity.label': 'Qual intensidade?',
  'notifications.intensity.gentle': 'suave',
  'notifications.intensity.balanced': 'equilibrado',
  'notifications.intensity.pushy': 'insistente',
  'notifications.intensity.gentleDesc':
    'Apenas quando sua sequência está em risco, mais marcos e retornos.',
  'notifications.intensity.balancedDesc':
    'Adiciona um lembrete de treino seg / qua / sex.',
  'notifications.intensity.pushyDesc':
    'Lembrete diário nos dias em que você não treinou.',
  'notifications.time.label': 'Hora do lembrete',
};

const it: Dictionary = {
  'common.on': 'Attivo',
  'common.off': 'Disattivo',
  'common.free': 'Gratuito',
  'common.notSet': 'Non impostato',
  'common.cancel': 'Annulla',
  'common.openSettings': 'Apri Impostazioni',
  'common.unlock': 'Sblocca',
  'settings.title': 'Impostazioni',
  'settings.section.account': 'Account',
  'settings.section.preferences': 'Preferenze',
  'settings.section.data': 'Dati',
  'settings.row.profile': 'Profilo',
  'settings.row.account': 'Account',
  'settings.row.membership': 'Gestisci abbonamento',
  'settings.row.notifications': 'Notifiche',
  'settings.row.bodyWeight': 'Peso corporeo',
  'settings.row.language': 'Lingua',
  'settings.row.export': 'Esporta allenamenti',
  'settings.row.exportPreparing': 'Preparazione del file…',
  'settings.export.failedTitle': 'Esportazione non riuscita',
  'settings.export.failedFallback': 'Riprova.',
  'language.title': 'Lingua',
  'language.intro':
    'Scegli la lingua usata in Kova. I nuovi testi appariranno subito nella lingua scelta.',
  'notifications.title': 'Notifiche',
  'notifications.streak.label': 'Promemoria della striscia',
  'notifications.streak.descOn':
    'Avvisi locali per non interrompere la tua striscia.',
  'notifications.streak.descOff': 'Attiva per ricevere avvisi sulla striscia.',
  'notifications.permission.title': 'Notifiche disattivate',
  'notifications.permission.body':
    'Attiva le notifiche di Kova nelle Impostazioni per ricevere i promemoria.',
  'notifications.intensity.label': 'Quanto insistente?',
  'notifications.intensity.gentle': 'leggero',
  'notifications.intensity.balanced': 'bilanciato',
  'notifications.intensity.pushy': 'insistente',
  'notifications.intensity.gentleDesc':
    'Solo quando la tua striscia è a rischio, più traguardi e ritorni.',
  'notifications.intensity.balancedDesc':
    'Aggiunge un promemoria di allenamento lun / mer / ven.',
  'notifications.intensity.pushyDesc':
    'Promemoria quotidiano nei giorni senza allenamento.',
  'notifications.time.label': 'Orario del promemoria',
};

const ja: Dictionary = {
  'common.on': 'オン',
  'common.off': 'オフ',
  'common.free': '無料',
  'common.notSet': '未設定',
  'common.cancel': 'キャンセル',
  'common.openSettings': '設定を開く',
  'common.unlock': 'ロック解除',
  'settings.title': '設定',
  'settings.section.account': 'アカウント',
  'settings.section.preferences': '環境設定',
  'settings.section.data': 'データ',
  'settings.row.profile': 'プロフィール',
  'settings.row.account': 'アカウント',
  'settings.row.membership': 'メンバーシップを管理',
  'settings.row.notifications': '通知',
  'settings.row.bodyWeight': '体重',
  'settings.row.language': '言語',
  'settings.row.export': 'ワークアウトをエクスポート',
  'settings.row.exportPreparing': 'ファイルを準備中…',
  'settings.export.failedTitle': 'エクスポートに失敗しました',
  'settings.export.failedFallback': 'もう一度お試しください。',
  'language.title': '言語',
  'language.intro':
    'Kova で使用する言語を選んでください。新しいテキストはすぐに反映されます。',
  'notifications.title': '通知',
  'notifications.streak.label': '連続記録のリマインダー',
  'notifications.streak.descOn': '連続記録を途切れさせないためのお知らせ。',
  'notifications.streak.descOff':
    '有効にすると連続記録のお知らせを受け取れます。',
  'notifications.permission.title': '通知が無効です',
  'notifications.permission.body':
    'リマインダーを受け取るには、デバイスの設定で Kova の通知を有効にしてください。',
  'notifications.intensity.label': '通知の強さ',
  'notifications.intensity.gentle': '控えめ',
  'notifications.intensity.balanced': 'ふつう',
  'notifications.intensity.pushy': '強め',
  'notifications.intensity.gentleDesc':
    '連続記録が途切れそうな時、達成や再開時のみ。',
  'notifications.intensity.balancedDesc':
    '月・水・金にワークアウトのお知らせを追加。',
  'notifications.intensity.pushyDesc':
    'トレーニングしていない日に毎日お知らせ。',
  'notifications.time.label': 'リマインダー時刻',
};

const zh: Dictionary = {
  'common.on': '已开启',
  'common.off': '已关闭',
  'common.free': '免费',
  'common.notSet': '未设置',
  'common.cancel': '取消',
  'common.openSettings': '打开设置',
  'common.unlock': '解锁',
  'settings.title': '设置',
  'settings.section.account': '账户',
  'settings.section.preferences': '偏好设置',
  'settings.section.data': '数据',
  'settings.row.profile': '个人资料',
  'settings.row.account': '账户',
  'settings.row.membership': '管理会员',
  'settings.row.notifications': '通知',
  'settings.row.bodyWeight': '体重',
  'settings.row.language': '语言',
  'settings.row.export': '导出训练记录',
  'settings.row.exportPreparing': '正在准备文件…',
  'settings.export.failedTitle': '导出失败',
  'settings.export.failedFallback': '请再试一次。',
  'language.title': '语言',
  'language.intro': '选择 Kova 使用的语言。新文本将立即以所选语言显示。',
  'notifications.title': '通知',
  'notifications.streak.label': '连续训练提醒',
  'notifications.streak.descOn': '本地提醒，助你保持连续训练。',
  'notifications.streak.descOff': '开启后接收连续训练提醒。',
  'notifications.permission.title': '通知已关闭',
  'notifications.permission.body':
    '请在设备设置中为 Kova 启用通知，以接收提醒。',
  'notifications.intensity.label': '提醒强度',
  'notifications.intensity.gentle': '温和',
  'notifications.intensity.balanced': '适中',
  'notifications.intensity.pushy': '强烈',
  'notifications.intensity.gentleDesc':
    '仅在连续记录有风险、达成里程碑或回归时提醒。',
  'notifications.intensity.balancedDesc': '周一、三、五额外加一次训练提醒。',
  'notifications.intensity.pushyDesc': '未训练的日子每天提醒。',
  'notifications.time.label': '提醒时间',
};

const ko: Dictionary = {
  'common.on': '켜짐',
  'common.off': '꺼짐',
  'common.free': '무료',
  'common.notSet': '설정 안 됨',
  'common.cancel': '취소',
  'common.openSettings': '설정 열기',
  'common.unlock': '잠금 해제',
  'settings.title': '설정',
  'settings.section.account': '계정',
  'settings.section.preferences': '환경설정',
  'settings.section.data': '데이터',
  'settings.row.profile': '프로필',
  'settings.row.account': '계정',
  'settings.row.membership': '멤버십 관리',
  'settings.row.notifications': '알림',
  'settings.row.bodyWeight': '체중',
  'settings.row.language': '언어',
  'settings.row.export': '운동 내보내기',
  'settings.row.exportPreparing': '파일 준비 중…',
  'settings.export.failedTitle': '내보내기 실패',
  'settings.export.failedFallback': '다시 시도해 주세요.',
  'language.title': '언어',
  'language.intro':
    'Kova에서 사용할 언어를 선택하세요. 새 텍스트는 즉시 선택한 언어로 표시됩니다.',
  'notifications.title': '알림',
  'notifications.streak.label': '연속 기록 알림',
  'notifications.streak.descOn': '연속 기록이 끊기지 않도록 알려드립니다.',
  'notifications.streak.descOff': '활성화하여 연속 기록 알림을 받으세요.',
  'notifications.permission.title': '알림이 꺼져 있습니다',
  'notifications.permission.body':
    '알림을 받으려면 기기 설정에서 Kova의 알림을 활성화하세요.',
  'notifications.intensity.label': '알림 강도',
  'notifications.intensity.gentle': '부드럽게',
  'notifications.intensity.balanced': '보통',
  'notifications.intensity.pushy': '강하게',
  'notifications.intensity.gentleDesc':
    '연속 기록 위험, 이정표, 복귀 시에만 알림.',
  'notifications.intensity.balancedDesc': '월·수·금 운동 알림 추가.',
  'notifications.intensity.pushyDesc': '운동하지 않은 날 매일 알림.',
  'notifications.time.label': '알림 시간',
};

const ru: Dictionary = {
  'common.on': 'Вкл.',
  'common.off': 'Выкл.',
  'common.free': 'Бесплатно',
  'common.notSet': 'Не задано',
  'common.cancel': 'Отмена',
  'common.openSettings': 'Открыть настройки',
  'common.unlock': 'Разблокировать',
  'settings.title': 'Настройки',
  'settings.section.account': 'Аккаунт',
  'settings.section.preferences': 'Предпочтения',
  'settings.section.data': 'Данные',
  'settings.row.profile': 'Профиль',
  'settings.row.account': 'Аккаунт',
  'settings.row.membership': 'Управление подпиской',
  'settings.row.notifications': 'Уведомления',
  'settings.row.bodyWeight': 'Вес тела',
  'settings.row.language': 'Язык',
  'settings.row.export': 'Экспорт тренировок',
  'settings.row.exportPreparing': 'Подготовка файла…',
  'settings.export.failedTitle': 'Не удалось экспортировать',
  'settings.export.failedFallback': 'Попробуйте ещё раз.',
  'language.title': 'Язык',
  'language.intro':
    'Выберите язык Kova. Новый текст сразу появится на выбранном языке.',
  'notifications.title': 'Уведомления',
  'notifications.streak.label': 'Напоминания о серии',
  'notifications.streak.descOn':
    'Локальные напоминания, чтобы не прерывать серию.',
  'notifications.streak.descOff':
    'Включите, чтобы получать напоминания о серии.',
  'notifications.permission.title': 'Уведомления отключены',
  'notifications.permission.body':
    'Включите уведомления Kova в настройках устройства, чтобы получать напоминания.',
  'notifications.intensity.label': 'Насколько настойчиво?',
  'notifications.intensity.gentle': 'мягко',
  'notifications.intensity.balanced': 'умеренно',
  'notifications.intensity.pushy': 'настойчиво',
  'notifications.intensity.gentleDesc':
    'Только когда серия под угрозой, плюс рубежи и возвращения.',
  'notifications.intensity.balancedDesc':
    'Добавляет напоминание о тренировке по пн / ср / пт.',
  'notifications.intensity.pushyDesc':
    'Ежедневное напоминание в дни без тренировки.',
  'notifications.time.label': 'Время напоминания',
};

const ar: Dictionary = {
  'common.on': 'مفعّل',
  'common.off': 'متوقف',
  'common.free': 'مجاني',
  'common.notSet': 'غير محدد',
  'common.cancel': 'إلغاء',
  'common.openSettings': 'فتح الإعدادات',
  'common.unlock': 'فتح',
  'settings.title': 'الإعدادات',
  'settings.section.account': 'الحساب',
  'settings.section.preferences': 'التفضيلات',
  'settings.section.data': 'البيانات',
  'settings.row.profile': 'الملف الشخصي',
  'settings.row.account': 'الحساب',
  'settings.row.membership': 'إدارة العضوية',
  'settings.row.notifications': 'الإشعارات',
  'settings.row.bodyWeight': 'وزن الجسم',
  'settings.row.language': 'اللغة',
  'settings.row.export': 'تصدير التمارين',
  'settings.row.exportPreparing': 'يتم تجهيز ملفك…',
  'settings.export.failedTitle': 'فشل التصدير',
  'settings.export.failedFallback': 'يرجى المحاولة مرة أخرى.',
  'language.title': 'اللغة',
  'language.intro':
    'اختر اللغة المستخدمة في Kova. سيظهر النص الجديد بلغتك فوراً.',
  'notifications.title': 'الإشعارات',
  'notifications.streak.label': 'تذكيرات السلسلة',
  'notifications.streak.descOn': 'تذكيرات محلية حتى لا تنقطع سلسلتك.',
  'notifications.streak.descOff': 'فعّلها لتلقي تذكيرات السلسلة.',
  'notifications.permission.title': 'الإشعارات معطّلة',
  'notifications.permission.body':
    'فعّل إشعارات Kova من إعدادات الجهاز لتلقي التذكيرات.',
  'notifications.intensity.label': 'مدى الإلحاح؟',
  'notifications.intensity.gentle': 'لطيف',
  'notifications.intensity.balanced': 'متوازن',
  'notifications.intensity.pushy': 'ملِحّ',
  'notifications.intensity.gentleDesc':
    'فقط عندما تكون السلسلة في خطر، بالإضافة إلى الإنجازات والعودات.',
  'notifications.intensity.balancedDesc':
    'يضيف تذكير تمرين أيام الإثنين والأربعاء والجمعة.',
  'notifications.intensity.pushyDesc': 'تذكير يومي في الأيام التي لم تتدرب فيها.',
  'notifications.time.label': 'وقت التذكير',
};

const hi: Dictionary = {
  'common.on': 'चालू',
  'common.off': 'बंद',
  'common.free': 'मुफ़्त',
  'common.notSet': 'सेट नहीं',
  'common.cancel': 'रद्द करें',
  'common.openSettings': 'सेटिंग्स खोलें',
  'common.unlock': 'अनलॉक करें',
  'settings.title': 'सेटिंग्स',
  'settings.section.account': 'खाता',
  'settings.section.preferences': 'प्राथमिकताएँ',
  'settings.section.data': 'डेटा',
  'settings.row.profile': 'प्रोफ़ाइल',
  'settings.row.account': 'खाता',
  'settings.row.membership': 'सदस्यता प्रबंधित करें',
  'settings.row.notifications': 'सूचनाएँ',
  'settings.row.bodyWeight': 'शरीर का वज़न',
  'settings.row.language': 'भाषा',
  'settings.row.export': 'वर्कआउट निर्यात करें',
  'settings.row.exportPreparing': 'आपकी फ़ाइल तैयार हो रही है…',
  'settings.export.failedTitle': 'निर्यात विफल',
  'settings.export.failedFallback': 'कृपया पुनः प्रयास करें।',
  'language.title': 'भाषा',
  'language.intro':
    'Kova में उपयोग की जाने वाली भाषा चुनें. नए टेक्स्ट तुरंत आपकी भाषा में दिखेंगे.',
  'notifications.title': 'सूचनाएँ',
  'notifications.streak.label': 'स्ट्रिक रिमाइंडर',
  'notifications.streak.descOn':
    'स्थानीय रिमाइंडर ताकि आपकी स्ट्रिक न टूटे.',
  'notifications.streak.descOff':
    'स्ट्रिक रिमाइंडर पाने के लिए सक्षम करें.',
  'notifications.permission.title': 'सूचनाएँ अक्षम हैं',
  'notifications.permission.body':
    'रिमाइंडर पाने के लिए डिवाइस सेटिंग्स में Kova की सूचनाएँ सक्षम करें.',
  'notifications.intensity.label': 'कितना ज़ोरदार?',
  'notifications.intensity.gentle': 'हल्का',
  'notifications.intensity.balanced': 'संतुलित',
  'notifications.intensity.pushy': 'ज़ोरदार',
  'notifications.intensity.gentleDesc':
    'केवल जब स्ट्रिक खतरे में हो, साथ ही मील के पत्थर और वापसी पर.',
  'notifications.intensity.balancedDesc':
    'सोम / बुध / शुक्र को वर्कआउट रिमाइंडर जोड़ता है.',
  'notifications.intensity.pushyDesc':
    'जिन दिनों आपने वर्कआउट नहीं किया, दैनिक रिमाइंडर.',
  'notifications.time.label': 'रिमाइंडर समय',
};

const DICTIONARIES: Record<LocaleCode, Dictionary> = {
  en,
  es,
  fr,
  de,
  pt,
  it,
  ja,
  zh,
  ko,
  ru,
  ar,
  hi,
};

export function translate(locale: LocaleCode, key: TranslationKey): string {
  return DICTIONARIES[locale]?.[key] ?? en[key];
}
