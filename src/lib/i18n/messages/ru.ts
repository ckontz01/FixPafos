import type { Messages } from "./el";
// Russian serves the large Russian-speaking community in Pafos. Russian uses
// four CLDR plural categories, so the one/few/many/other entries genuinely
// differ here, unlike Greek and English.
export const ru: Messages = {
  "app.name": "FixPafos",
  "app.title": "FixPafos · Ваш район на карте",
  "app.description":
    "Общественная платформа для сообщений о повседневных проблемах в Пафосе. Сообщайте о дорогах, канализации, воде и уборке с указанием ответственной службы.",
  "app.logoDisclosure": "??????? FixPafos ?????? ? ??????? ??.",
  "app.independent": "Независимая общественная платформа",

  "lang.label": "Язык",
  "lang.select": "Выбор языка",

  "nav.main": "Основная навигация",
  "nav.home": "Главная FixPafos",
  "nav.map": "Карта сообщества",
  "nav.services": "Местные службы",
  "nav.insights": "Аналитика",
  "nav.moderation": "Модерация",
  "nav.report": "Сообщить о проблеме",
  "nav.location": "Пафос, Кипр",

  "common.refresh": "Обновить",
  "common.retry": "Попробовать снова",
  "common.cancel": "Отмена",
  "common.pleaseWait": "Подождите…",
  "common.loading": "Загрузка…",
  "common.clearFilters": "Сбросить фильтры",
  "common.all": "Все",
  "common.yes": "Да",
  "common.no": "Нет",
  "common.justNow": "Только что",
  "common.minutesAgo": "{count} мин назад",
  "common.hoursAgo": "{count} ч назад",
  "common.notAvailable": "—",

  "board.label": "Доска сообщества",
  "board.kicker": "ВАШ РАЙОН НА СВЯЗИ",
  "board.title": "Лучший Пафос начинается здесь.",
  "board.subtitle":
    "Заметили проблему. Отметьте её на карте. Следите за решением вместе.",
  "board.totals": "Всего сообщений сообщества",
  "board.openReports.one": "открытое сообщение",
  "board.openReports.few": "открытых сообщения",
  "board.openReports.many": "открытых сообщений",
  "board.openReports.other": "открытых сообщений",
  "board.resolvedCount": "решено",
  "board.statusFilter": "Статус сообщения",
  "board.statusAll": "Все сообщения",
  "board.search": "Поиск сообщений",
  "board.searchPlaceholder": "Поиск сообщений или мест",
  "board.clearSearch": "Очистить поиск",
  "board.typeFilter": "Тип проблемы",
  "board.typeFilterAria": "Фильтр по типу проблемы",
  "board.allTypes": "Все типы проблем",
  "board.reportCount.one": "{count} сообщение",
  "board.reportCount.few": "{count} сообщения",
  "board.reportCount.many": "{count} сообщений",
  "board.reportCount.other": "{count} сообщений",
  "board.loadingReports": "Загрузка сообщений…",
  "board.refreshAria": "Обновить сообщения",
  "board.loadErrorTitle": "Не удалось загрузить доску",
  "board.updatesPaused": "Обновления приостановлены: {message}",
  "board.emptyMatchTitle": "Нет подходящих сообщений",
  "board.emptyMatchBody": "Попробуйте другой запрос или тип проблемы.",
  "board.emptyFirstTitle": "Станьте первым, кто отметит это на карте.",
  "board.emptyFirstBody":
    "Разбитый тротуар. Забитый сток. Погасший фонарь. Начните с того, что видите.",
  "board.addFirst": "Добавить первое сообщение",
  "board.loadMore": "Загрузить ещё сообщения",
  "board.explainerTitle": "Небольшое сообщение. Общее улучшение.",
  "board.explainerBody":
    "От сломанного фонаря до забитого стока — помогите отметить нужды вашего района на карте.",
  "board.supporting": "{count} поддерживают",
  "board.replies": "{count} ответов",

  "report.backToBoard": "Доска сообщества",
  "report.title": "Что нужно исправить?",
  "report.subtitle":
    "Чёткое описание и точное местоположение помогают всем понять проблему.",
  "report.type": "Тип проблемы",
  "report.unsure": "Я не уверен(а)",
  "report.autoClassifyNote":
    "Тип проблемы будет определён автоматически, а ответственная служба предложена по вашему описанию и местоположению.",
  "report.locationChosen": "Местоположение выбрано",
  "report.locationPrompt": "Выберите точку на карте",
  "report.locationChosenHint": "{coords} · нажмите снова, чтобы переместить",
  "report.locationPromptHint":
    "Нажмите точное место или используйте кнопку центра карты.",
  "report.landmark": "Улица или ближайший ориентир",
  "report.landmarkPlaceholder": "напр. проспект Апостолу Павлу",
  "report.author": "Ваше имя или псевдоним",
  "report.authorPlaceholder": "Как вы хотите отображаться публично",
  "report.message": "Что происходит?",
  "report.messagePlaceholder":
    "Опишите проблему и что требует внимания. Русский, Ελληνικά и English приветствуются.",
  "report.privacyNote":
    "Ваше имя, сообщение и местоположение будут публичными. Не указывайте телефоны, домашние адреса и другие личные данные.",
  "report.routingNote":
    "Мы автоматически предложим ответственную службу. Публикация здесь не является официальным обращением в орган власти.",
  "report.submit": "Опубликовать сообщение",
  "report.submitting": "Проверка и маршрутизация…",
  "report.finePrint":
    "Сообщения проверяются перед публикацией. Если сообщение заблокировано, модератор может его рассмотреть.",
  "report.published":
    "Ваше сообщение опубликовано и видно всем на карте.",
  "report.charCount": "{count}/500",

  "issue.backToAll": "Все сообщения",
  "issue.reportedBy": "Сообщено {time}",
  "issue.autoClassified": "Классифицировано автоматически",
  "issue.suggestedService": "Предполагаемая ответственная служба",
  "issue.assignmentLow":
    "Ответственность неясна. Маршрутизацию должен проверить человек.",
  "issue.assignmentAuto":
    "Назначено автоматически. Ответственность должна подтвердить служба.",
  "issue.officialContact": "Официальная страница контактов",
  "issue.notSent": "Не отправлено в орган власти.",
  "issue.support": "Я тоже это вижу",
  "issue.supported": "Поддержано",
  "issue.resolvedBy": "Отмечено решённым службой {department} · {time}",
  "issue.photoPending": "Фотография ожидает проверки модератором.",
  "issue.photoAlt": "Проблема по адресу {location}",

  "status.open": "Открыто",
  "status.resolved": "✓ Решено",
  "status.openPlain": "Открыто",
  "status.resolvedPlain": "Решено",

  "reply.heading": "Ответы сообщества",
  "reply.empty": "Добавьте полезные детали или новости из района.",
  "reply.author": "Ваше имя или псевдоним",
  "reply.add": "Добавить ответ",
  "reply.placeholder": "Поделитесь новостью…",
  "reply.finePrint": "Ответы публичны и проверяются перед публикацией.",
  "reply.submit": "Отправить ответ",
  "reply.verified": "Подтверждённая служба",
  "reply.verifiedResolved": "Подтверждённая служба · Решено",
  "reply.verifiedTitle":
    "Опубликовано с использованием пароля службы в FixPafos",

  "flag.action": "Пожаловаться на сообщение",
  "flag.title": "Пожаловаться на это сообщение?",
  "flag.body":
    "Жалоба отправляет сообщение на проверку модератору. Она не удаляет сразу содержимое другого гражданина.",
  "flag.reason": "Причина жалобы",
  "flag.reason.offensive": "Оскорбительное содержание",
  "flag.reason.spam": "Спам или реклама",
  "flag.reason.personal": "Содержит личные данные",
  "flag.reason.wrong": "Неверное или вводящее в заблуждение",
  "flag.reason.other": "Другая причина",
  "flag.submit": "Отправить жалобу",
  "flag.submitting": "Отправка…",
  "flag.received": "Спасибо. Жалоба записана, модератор её рассмотрит.",
  "flag.hidden":
    "Сообщение временно скрыто с публичной доски и ожидает проверки.",
  "flag.alreadyFlagged": "Вы уже жаловались на это сообщение.",

  "team.panel": "Доступ служебной команды",
  "team.department": "Служба",
  "team.password": "Пароль службы",
  "team.verify": "Подтвердить команду",
  "team.verified": "Пароль службы подтверждён",
  "team.signOut": "Выйти",
  "team.update": "Официальное обновление",
  "team.postReply": "Опубликовать подтверждённый ответ",
  "team.resolve": "Отметить решённым",
  "team.notAssigned":
    "Только назначенная служба может опубликовать подтверждённое обновление.",

  "moderation.title": "Карантин модерации",
  "moderation.intro":
    "Проверьте материалы, заблокированные фильтром или моделью. Одобренные публикуются на общей доске.",
  "moderation.password": "Пароль модерации",
  "moderation.open": "Открыть карантин",
  "moderation.checking": "Проверка…",
  "moderation.awaiting": "{count} ожидают проверки",
  "moderation.lock": "Заблокировать",
  "moderation.emptyTitle": "Нет материалов на проверке",
  "moderation.emptyBody":
    "Заблокированные сообщения и ответы появятся здесь.",
  "moderation.approve": "Одобрить и опубликовать",
  "moderation.published": "Опубликовано",
  "moderation.flagsTitle": "Сообщения с жалобами",
  "moderation.flagsEmpty": "Нет сообщений с жалобами.",
  "moderation.flagCount": "{count} жалоб",
  "moderation.restore": "Вернуть на доску",
  "moderation.remove": "Скрыть навсегда",
  "moderation.clusterTitle": "Предполагаемые дубликаты",
  "moderation.clusterEmpty": "Нет предложений по объединению.",
  "moderation.clusterConfirm": "Подтвердить связь",
  "moderation.clusterSeparate": "Разделить",

  "photo.label": "Фотография (необязательно)",
  "photo.choose": "Выбрать фотографию",
  "photo.remove": "Удалить фотографию",
  "photo.hint":
    "JPEG, PNG или WebP, до 4 МБ. Данные о местоположении удаляются.",
  "photo.approved": "Фото · одобрено",
  "photo.rejected": "Фото · отклонено",
  "photo.pending": "Фото · на проверке",
  "photo.approve": "Одобрить фото",
  "photo.reject": "Отклонить фото",
  "photo.view": "Посмотреть приватное фото",
  "photo.reviewTitle": "Проверка фотографий",

  "severity.label": "Серьёзность",
  "severity.critical": "Критическая",
  "severity.high": "Высокая",
  "severity.medium": "Средняя",
  "severity.low": "Низкая",
  "severity.advisory":
    "Оценка модели для помощи в приоритизации. Не является официальным решением муниципалитета.",
  "severity.why": "Почему такая оценка?",
  "severity.slaSuggested": "Рекомендуемый срок реакции: {window}",
  "severity.sla.critical": "в течение 4 часов",
  "severity.sla.high": "в течение 2 рабочих дней",
  "severity.sla.medium": "в течение 10 рабочих дней",
  "severity.sla.low": "в течение 30 рабочих дней",
  "severity.needsReview": "Требуется проверка человеком",
  "severity.factor.danger": "Непосредственная опасность для людей",
  "severity.factor.infrastructure": "Влияние на инфраструктуру",
  "severity.factor.accessibility": "Влияние на доступность",
  "severity.factor.traffic": "Нарушение движения",
  "severity.factor.environment": "Воздействие на окружающую среду",
  "severity.factor.people": "Число затронутых жителей",
  "severity.factor.escalation": "Риск ухудшения",
  "severity.factor.recurrence": "Повторяющаяся проблема",

  "cluster.label": "Связанные сообщения",
  "cluster.count.one": "{count} сообщение жителя",
  "cluster.count.few": "{count} сообщения жителей",
  "cluster.count.many": "{count} сообщений жителей",
  "cluster.count.other": "{count} сообщений жителей",
  "cluster.explain":
    "Эти сообщения, по-видимому, описывают одну и ту же физическую проблему. Каждое сообщение сохраняется отдельно.",
  "cluster.why": "Почему они связаны?",
  "cluster.distance": "Расстояние {metres} м",
  "cluster.pendingReview": "Возможный дубликат — ожидает проверки",
  "cluster.separated": "Разделено модератором",
  "cluster.viewOriginal": "Посмотреть исходное сообщение",

  "insights.title": "Операционная аналитика",
  "insights.subtitle":
    "Операционный обзор публичных сообщений в Пафосе. Все цифры получены из реальных данных базы.",
  "insights.demoBanner":
    "Показаны демонстрационные данные. Это не реальные сообщения жителей.",
  "insights.totalReports": "Всего сообщений",
  "insights.activeIssues": "Активные проблемы",
  "insights.resolvedIssues": "Решено",
  "insights.resolutionRate": "Доля решённых",
  "insights.avgResolution": "Среднее время решения",
  "insights.medianResolution": "Медианное время решения",
  "insights.byCategory": "Сообщения по категориям",
  "insights.byDepartment": "Сообщения по службам",
  "insights.byStatus": "Сообщения по статусу",
  "insights.bySeverity": "Сообщения по серьёзности",
  "insights.overTime": "Сообщения во времени",
  "insights.hotspots": "Географические очаги",
  "insights.recurring": "Повторяющиеся места",
  "insights.clusters": "Размеры групп дубликатов",
  "insights.departmentPerformance": "Скорость реакции служб",
  "insights.seasonal": "Сезонные закономерности",
  "insights.filters": "Фильтры",
  "insights.dateFrom": "С",
  "insights.dateTo": "По",
  "insights.noData": "Недостаточно данных за этот период.",
  "insights.export": "Экспорт CSV",
  "insights.exportDigest": "Сводка для службы",
  "insights.days": "{count} дней",
  "insights.hours": "{count} часов",
  "insights.reportsUnit": "сообщений",
  "insights.openLink": "Открыть аналитику",


  "map.label": "Публичная карта проблем Пафоса",
  "map.pickPrompt": "Нажмите на карту, чтобы разместить сообщение",
  "map.tagline": "Ваш район на карте",
  "map.loading": "Загрузка улиц Пафоса…",
  "map.opening": "Открытие карты Пафоса…",
  "map.moveToPafos": "Переместите карту на Пафос, прежде чем выбирать место.",
  "map.noGeolocation":
    "Ваш браузер не поддерживает геолокацию. Выберите точку на карте.",
  "map.outsideArea":
    "Вы за пределами зоны сообщений Пафоса. Выберите точку на карте.",
  "map.locationUnavailable":
    "Доступ к местоположению недоступен. Вы можете выбрать точку на карте.",
  "map.useMyLocation": "Использовать моё местоположение",
  "map.reset": "Сбросить карту Пафоса",
  "map.dismiss": "Закрыть сообщение карты",
  "map.panHint": "Переместите или приблизьте карту к точному месту.",
  "map.useCentre": "Использовать центр карты",
  "map.publicReports.one": "{count} публичное сообщение на этой карте",
  "map.publicReports.few": "{count} публичных сообщения на этой карте",
  "map.publicReports.many": "{count} публичных сообщений на этой карте",
  "map.publicReports.other": "{count} публичных сообщений на этой карте",
  "map.selectPin": "Выберите метку, чтобы прочитать",
  "map.resolvedPrefix": "Решено · ",


  "team.access": "Доступ команды",
  "team.replyPlaceholder": "Объясните, что ваша команда сделала или сделает…",
  "team.resolvedState": "Решено",
  "team.updateHint":
    "Добавьте обновление перед решением. Подтверждённые ответы проходят те же проверки, что и ответы сообщества.",
  "team.signOutFull": "Выйти из доступа команды",
  "team.otherTeam":
    "Вы подтверждены как {department}. Эта проблема относится к другой команде.",
  "team.eligibility":
    "Для уполномоченных представителей с паролем, выданным FixPafos. Подтверждение удостоверяет доступ к платформе, а не трудовые отношения.",
  "team.replyNotice": "Подтверждённый ответ опубликован.",
  "team.resolveNotice": "Проблема отмечена решённой. Ваше обновление публично.",
  "team.unavailable": "Подтверждение команды временно недоступно.",

  "photo.previewAlt": "Предпросмотр выбранной фотографии",
  "photo.pickerHint":
    "JPEG, PNG или WebP, до 4 МБ. Фотография автоматически сверяется с сообщением. Чёткие, релевантные и безопасные фото одобряются автоматически; остальные остаются приватными для проверки. Избегайте лиц, номерных знаков и личных данных.",
  "photo.invalidChoice": "Выберите фото JPEG, PNG или WebP до 4 МБ.",
  "photo.noneToReview": "Нет фотографий для проверки.",


  "moderation.photoIntro":
    "Явно релевантные и безопасные фотографии одобряются автоматически. Неоднозначные, нерелевантные, неприемлемые или чувствительные фотографии и неудавшиеся автоматические проверки остаются приватными здесь, сначала ожидающие. Проверьте изображение перед одобрением. Фотографии становятся публичными только когда опубликовано и само сообщение.",
  "moderation.refreshPhotos": "Обновить фотографии",
  "moderation.quarantineMeta": "{type} · {status} · {blockedBy} / {category}",
  "photo.awaitingAlt": "Фотография ожидает модерации",
  "photo.autoApproved": "Одобрено автоматически. ",
  "photo.reviewedByModerator": "Проверено модератором. ",
  "photo.needsReview": "Требуется проверка модератором. ",
  "photo.aiAssessment": "Оценка ИИ: {category} (уверенность: {confidence}). ",
  "photo.noAssessment": "Автоматическая оценка для этой фотографии недоступна.",


  "insights.showTable": "Показать таблицу",
  "insights.showChart": "Показать график",
  "insights.opened": "Новые",
  "insights.resolvedSeries": "Решённые",
  "insights.allCategories": "Все категории",
  "insights.allDepartments": "Все службы",
  "insights.allSeverities": "Все уровни серьёзности",
  "insights.allStatuses": "Все статусы",
  "insights.apply": "Применить",
  "insights.reset": "Сбросить",
  "insights.metric": "Показатель",
  "insights.value": "Значение",
  "insights.location": "Место",
  "insights.department": "Служба",
  "insights.category": "Категория",
  "insights.count": "Количество",
  "insights.medianLabel": "Медиана",
  "insights.clusterLabel": "Группа",
  "insights.size": "Размер",
  "insights.day": "День",
  "insights.month": "Месяц",
  "insights.noReports": "Пока нет сообщений для анализа.",
  "insights.backToMap": "Вернуться к карте",
  "insights.method":
    "Каждое число вычислено из сохранённых сообщений. Скрытые сообщения исключены. Ничего не оценивается и не додумывается.",
  "insights.last30": "Последние 30 дней",
  "insights.last90": "Последние 90 дней",
  "insights.last365": "Последний год",
  "insights.allTime": "За всё время",
  "insights.period": "Период",
  "insights.hoursUnit": "ч",
  "insights.daysUnit": "д",

  "a11y.skipToContent": "Перейти к содержанию",
  "a11y.mapLabel": "Интерактивная карта сообщений Пафоса",
  "a11y.mapAlternative": "Список сообщений (альтернатива карте)",
  "a11y.useMapCentre": "Использовать центр карты",
  "a11y.locateMe": "Найти моё местоположение",
  "a11y.selectedIssue": "Выбранное сообщение: {title}",

  "voice.start": "Продиктовать сообщение",
  "voice.stop": "Остановить диктовку",
  "voice.listening": "Слушаю…",
  "voice.review":
    "Проверьте и исправьте текст перед отправкой. Ничего не отправляется автоматически.",
  "voice.unsupported": "Диктовка не поддерживается в этом браузере.",
  "voice.error": "Диктовка не завершилась. Попробуйте снова или введите текст.",

  "offline.queued":
    "Нет соединения. Сообщение сохранено на устройстве и ещё не отправлено.",
  "offline.pending.one": "{count} сообщение ожидает отправки",
  "offline.pending.few": "{count} сообщения ожидают отправки",
  "offline.pending.many": "{count} сообщений ожидают отправки",
  "offline.pending.other": "{count} сообщений ожидают отправки",
  "offline.sending": "Отправка ожидающих сообщений…",
  "offline.sent": "Ожидающие сообщения отправлены.",
  "offline.notSubmitted": "Ещё не отправлено",
  "offline.discard": "Отклонить",

  "translation.original": "Исходный текст жителя",
  "translation.machine": "Машинный перевод",
  "translation.showOriginal": "Показать оригинал",
  "translation.showTranslation": "Показать перевод",
  "translation.notice":
    "Машинный перевод для служебного использования. Приоритет имеет исходный текст жителя.",
  "translation.detected": "Язык сообщения: {language}",

  "demo.banner":
    "Демонстрационный режим: данные являются образцом, а автоматические проверки могут выполняться локально.",
  "demo.aiUnavailable":
    "Служба модели недоступна. Используется детерминированная резервная классификация, помеченная соответствующим образом.",
  "demo.seeded": "Демонстрационные данные",

  "category.roads": "Дороги и тротуары",
  "category.sewage": "Канализация и дренаж",
  "category.water": "Водоснабжение",
  "category.waste": "Отходы и уборка",
  "category.lighting": "Уличное освещение",
  "category.parks": "Парки и зелёные зоны",
  "category.traffic": "Движение и парковка",
  "category.other": "Другая местная проблема",

  "department.technical": "Муниципалитет Пафоса · Технические службы",
  "department.sewerage": "EOA Пафос · Канализация и дренаж",
  "department.water": "EOA Пафос · Водоснабжение",
  "department.cleaning": "Муниципалитет Пафоса · Служба уборки",
  "department.green": "Муниципалитет Пафоса · Служба озеленения",
  "department.traffic": "Муниципалитет Пафоса · Служба движения",
  "department.health": "Муниципалитет Пафоса · Санитарная служба",
  "department.review": "Муниципалитет Пафоса · Общие вопросы",

  "departmentRemit.technical":
    "Муниципальные дороги, ямы, тротуары, доступность, общественная инфраструктура и уличное освещение. Магистрали могут быть переданы в Управление общественных работ.",
  "departmentRemit.sewerage":
    "Засоры городской канализации, утечки сточных вод и неисправности ливневой сети.",
  "departmentRemit.water":
    "Утечки городского водопровода, перебои с подачей и неисправности водопроводной сети.",
  "departmentRemit.cleaning":
    "Невывезенный мусор, засорение, незаконные свалки и уборка улиц.",
  "departmentRemit.green":
    "Муниципальные парки, деревья, разросшаяся растительность и зелёные зоны.",
  "departmentRemit.traffic":
    "Муниципальная парковка и местные жалобы на движение. Дорожные работы передаются в Технические службы.",
  "departmentRemit.health":
    "Общественная гигиена, вредители и санитарные жалобы, кроме неисправностей канализации.",
  "departmentRemit.review":
    "Неясные, смешанные или вне компетенции вопросы, требующие маршрутизации человеком. Не является подтверждением ответственности.",

  "services.kicker": "УЗНАЙТЕ, К КОМУ ОБРАТИТЬСЯ",
  "services.title": "Местные службы.",
  "services.subtitle": "Найдите команду, которая заботится о вашем районе.",
  "services.note":
    "Сообщения получают предполагаемую службу. Для официального обращения свяжитесь с органом власти напрямую.",
  "services.disclaimer":
    "Официальные логотипы обозначают каждую службу. FixPafos — независимая общественная платформа.",

  "error.generic": "Запрос не выполнен. Попробуйте снова.",
  "error.unavailable":
    "Доска сообщества временно недоступна. Попробуйте снова.",
  "error.crossOrigin": "Запрос отклонён.",
  "error.invalidReport":
    "Укажите имя (до 40 символов), сообщение (до 500), категорию и местоположение в районе Пафоса.",
  "error.invalidReply": "Укажите имя и ответ до 500 символов.",
  "error.invalidIssue": "Неверное сообщение.",
  "error.notFound": "Сообщение не найдено.",
  "error.rateLimited": "Слишком много отправок. Подождите минуту.",
  "error.rateLimitedFlag": "Подождите минуту перед следующей жалобой.",
  "error.rateLimitedVote": "Подождите минуту перед следующим голосом.",
  "error.rateLimitedLogin":
    "Слишком много попыток подтверждения. Попробуйте через 15 минут.",
  "error.moderationBlocked":
    "Это сообщение не опубликовано, так как может содержать неприемлемое содержание. Оно сохранено для проверки модератором.",
  "error.moderationBlockedReply":
    "Этот ответ не опубликован, так как может содержать неприемлемое содержание. Он сохранён для проверки модератором.",
  "error.moderationUnavailable":
    "Сейчас не удалось выполнить проверку. Попробуйте снова.",
  "error.assignmentUnavailable":
    "Назначение службы временно недоступно. Сообщение не опубликовано; попробуйте снова.",
  "error.photoTooLarge": "Выберите фотографию меньше 4 МБ.",
  "error.photoInvalid":
    "Выберите корректное фото JPEG, PNG или WebP, до 4 МБ и 25 мегапикселей.",
  "error.teamUnauthorized": "Сначала подтвердите вашу службу.",
  "error.teamForbidden":
    "Только назначенная служба может дать подтверждённое обновление или решить эту проблему.",
  "error.teamBadPassword": "Неверный пароль службы.",
  "error.alreadyResolved": "Эта проблема уже решена.",
  "error.conflict": "Проблема изменилась. Обновите страницу и попробуйте снова.",
  "error.moderationPassword": "Неверный пароль модерации.",
  "error.moderationNotConfigured": "Доступ модерации не настроен.",
  "error.updateLength": "Добавьте обновление длиной 1–500 символов.",
};
