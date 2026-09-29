import type { Locale } from "./i18n/config";

const en = {
  nav: "Report with AI",
  experimental: "Experimental",
  title: "Let’s report it, together.",
  intro:
    "Describe what you noticed. I’ll ask a few questions, then help you add a photo and a place on the map.",
  back: "Community map",
  standard: "Use the standard form",
  assistant: "FixPafos assistant",
  you: "You",
  privacy:
    "Your messages go to DeepSeek to prepare a draft. Camera and location open only when you choose. Nothing is published until you review and submit.",
  steps: ["Describe", "Photo", "Location", "Name", "Review"],
  greeting:
    "What needs fixing in your neighbourhood? Type a description or record your voice. Tell me what you can see and how it affects people.",
  input: "Your message",
  placeholder:
    "For example: a broken pavement makes it hard to pass with a pushchair…",
  send: "Send message",
  thinking: "Preparing your next step…",
  continue: "Continue with this draft",
  retry: "Try again",
  aiError:
    "The assistant could not reply. Your text is still here. Try again or continue using your own words.",
  useOwn: "Continue with my own words",
  limit: "Let’s review the details you have provided and continue.",
  photoPrompt:
    "Can you add a photo of the issue? Open your camera or choose an existing photo. Only take a picture if it is safe; this step is optional.",
  camera: "Open camera",
  capture: "Take photo",
  closeCamera: "Close camera",
  cameraStarting: "Opening camera…",
  cameraError:
    "The camera could not open. Check browser permissions, or choose a photo below.",
  cameraPreview: "Camera preview",
  photoContinue: "Use this photo",
  photoSkip: "Continue without a photo",
  photoAdded: "Photo attached",
  photoSkipped: "No photo attached",
  photoNote:
    "The photo stays on this page until you submit. It then goes through the usual AI and moderator review before appearing publicly.",
  locationPrompt:
    "Where is the issue? Use GPS if you are there now, or choose the actual spot on the map. Add a street or nearby landmark so others can find it.",
  gps: "Use GPS",
  locating: "Finding your location…",
  map: "Choose on map",
  locationConfirm: "Confirm this location",
  locationNote:
    "GPS is your current position, which may differ from the issue’s location. Check the pin before continuing.",
  gpsError:
    "Location could not be found. Allow location access or choose a point on the map.",
  outside:
    "That position is outside the Pafos reporting area. Choose the issue’s position on the map.",
  accuracy: "GPS accuracy: approximately",
  metres: "m",
  landmark: "Street or nearby landmark",
  landmarkPlaceholder: "Street name, junction or nearby building",
  coordinates: "Selected coordinates",
  namePrompt:
    "What name should appear beside your public report? A nickname is fine. Please don’t include a phone number or private contact details.",
  name: "Public display name",
  nameContinue: "Review my report",
  reviewPrompt:
    "Here is your report. Check the description, photo and location. You can edit the text below. DeepSeek will classify the issue and suggest a department when you submit.",
  description: "Report description",
  aiDraft: "Draft prepared with AI · please check it",
  ownDraft: "Draft from your words",
  editPhoto: "Change photo",
  editLocation: "Change location",
  editDetails: "Back to the conversation",
  submit: "Submit report",
  submitting: "Checking and submitting…",
  publishNote:
    "Your name, description, map location and approved photo will be public. Normal text moderation, photo review and department assignment apply. This does not dispatch a service.",
  success: "Your report is on the community map.",
  photoPending: "Your photo may remain private while its review is pending.",
  view: "View my report",
  another: "Report another issue",
  quarantined:
    "Your report was saved for moderator review and has not been published.",
  submitError:
    "The submission could not be confirmed. Your draft is still here. Check the community map before trying again.",
  invalid:
    "Please add a name, description, landmark and a valid location in Pafos.",
  record: "Record voice",
  stop: "Stop recording",
  recording: "Recording · up to 90 seconds",
  starting: "Opening microphone…",
  voiceNote:
    "Your browser transcribes speech and may use its speech service. DeepSeek receives only the text you send. The audio recording stays on this page and is not uploaded.",
  voiceUnsupported:
    "Voice recording is unavailable in this browser. You can type your description instead.",
  transcriptUnavailable:
    "Automatic transcription is unavailable here. You can replay the recording and type its description, or use your keyboard’s dictation.",
  micError:
    "The microphone could not start. Check permissions or type your description.",
  transcript: "Check or edit the voice transcript",
  transcriptPlaceholder:
    "Your spoken words will appear here. You can also type them.",
  useTranscript: "Use this text",
  discard: "Discard recording",
  playback: "Your voice recording",
  emergency:
    "For immediate danger, call 112. FixPafos is not an emergency service.",
  newChat: "Start again",
  restartConfirm: "Discard this draft and start again?",
  online: "This experimental assistant needs an internet connection.",
} as const;

type Copy = {
  [K in keyof typeof en]: K extends "steps" ? readonly string[] : string;
};
const el: Copy = {
  nav: "Αναφορά με AI",
  experimental: "Πειραματικό",
  title: "Ας το αναφέρουμε μαζί.",
  intro:
    "Περιγράψτε τι παρατηρήσατε. Θα σας κάνω λίγες ερωτήσεις και μετά θα προσθέσουμε φωτογραφία και σημείο στον χάρτη.",
  back: "Χάρτης κοινότητας",
  standard: "Χρήση της απλής φόρμας",
  assistant: "Βοηθός FixPafos",
  you: "Εσείς",
  privacy:
    "Τα μηνύματά σας αποστέλλονται στο DeepSeek για σύνταξη προσχεδίου. Η κάμερα και η τοποθεσία ενεργοποιούνται μόνο αν το επιλέξετε. Τίποτα δεν δημοσιεύεται πριν τον έλεγχο και την υποβολή σας.",
  steps: ["Περιγραφή", "Φωτογραφία", "Τοποθεσία", "Όνομα", "Έλεγχος"],
  greeting:
    "Τι χρειάζεται επισκευή στη γειτονιά σας; Γράψτε μια περιγραφή ή ηχογραφήστε τη φωνή σας. Πείτε μου τι βλέπετε και πώς επηρεάζει τον κόσμο.",
  input: "Το μήνυμά σας",
  placeholder:
    "Για παράδειγμα: το σπασμένο πεζοδρόμιο δυσκολεύει τη διέλευση με καροτσάκι…",
  send: "Αποστολή μηνύματος",
  thinking: "Ετοιμάζω το επόμενο βήμα…",
  continue: "Συνέχεια με αυτό το προσχέδιο",
  retry: "Νέα προσπάθεια",
  aiError:
    "Ο βοηθός δεν μπόρεσε να απαντήσει. Το κείμενό σας παραμένει εδώ. Δοκιμάστε ξανά ή συνεχίστε με τα δικά σας λόγια.",
  useOwn: "Συνέχεια με τα δικά μου λόγια",
  limit: "Ας ελέγξουμε τις πληροφορίες που δώσατε και ας συνεχίσουμε.",
  photoPrompt:
    "Μπορείτε να προσθέσετε φωτογραφία του προβλήματος; Ανοίξτε την κάμερα ή επιλέξτε μια υπάρχουσα φωτογραφία. Φωτογραφίστε μόνο αν είναι ασφαλές· το βήμα είναι προαιρετικό.",
  camera: "Άνοιγμα κάμερας",
  capture: "Λήψη φωτογραφίας",
  closeCamera: "Κλείσιμο κάμερας",
  cameraStarting: "Άνοιγμα κάμερας…",
  cameraError:
    "Η κάμερα δεν άνοιξε. Ελέγξτε τις άδειες του προγράμματος περιήγησης ή επιλέξτε φωτογραφία παρακάτω.",
  cameraPreview: "Προεπισκόπηση κάμερας",
  photoContinue: "Χρήση φωτογραφίας",
  photoSkip: "Συνέχεια χωρίς φωτογραφία",
  photoAdded: "Προστέθηκε φωτογραφία",
  photoSkipped: "Χωρίς φωτογραφία",
  photoNote:
    "Η φωτογραφία παραμένει σε αυτή τη σελίδα μέχρι την υποβολή. Μετά περνά από τον συνήθη έλεγχο AI και εποπτείας πριν εμφανιστεί δημόσια.",
  locationPrompt:
    "Πού βρίσκεται το πρόβλημα; Χρησιμοποιήστε GPS αν είστε εκεί τώρα ή επιλέξτε το σωστό σημείο στον χάρτη. Προσθέστε οδό ή κοντινό σημείο αναφοράς.",
  gps: "Χρήση GPS",
  locating: "Εντοπισμός τοποθεσίας…",
  map: "Επιλογή στον χάρτη",
  locationConfirm: "Επιβεβαίωση τοποθεσίας",
  locationNote:
    "Το GPS δείχνει τη θέση σας, που μπορεί να διαφέρει από το σημείο του προβλήματος. Ελέγξτε την πινέζα πριν συνεχίσετε.",
  gpsError:
    "Δεν βρέθηκε η τοποθεσία. Επιτρέψτε την πρόσβαση ή επιλέξτε σημείο στον χάρτη.",
  outside:
    "Αυτή η θέση είναι εκτός της περιοχής αναφορών Πάφου. Επιλέξτε το σημείο του προβλήματος στον χάρτη.",
  accuracy: "Ακρίβεια GPS: περίπου",
  metres: "μ.",
  landmark: "Οδός ή κοντινό σημείο αναφοράς",
  landmarkPlaceholder: "Όνομα οδού, διασταύρωση ή κοντινό κτίριο",
  coordinates: "Επιλεγμένες συντεταγμένες",
  namePrompt:
    "Ποιο όνομα θέλετε να εμφανίζεται στη δημόσια αναφορά; Μπορείτε να βάλετε ψευδώνυμο. Μην προσθέσετε τηλέφωνο ή προσωπικά στοιχεία επικοινωνίας.",
  name: "Δημόσιο όνομα",
  nameContinue: "Έλεγχος αναφοράς",
  reviewPrompt:
    "Η αναφορά σας είναι έτοιμη για έλεγχο. Ελέγξτε περιγραφή, φωτογραφία και τοποθεσία. Μπορείτε να διορθώσετε το κείμενο. Το DeepSeek θα ταξινομήσει το πρόβλημα και θα προτείνει υπηρεσία κατά την υποβολή.",
  description: "Περιγραφή προβλήματος",
  aiDraft: "Προσχέδιο με AI · ελέγξτε το",
  ownDraft: "Προσχέδιο από τα λόγια σας",
  editPhoto: "Αλλαγή φωτογραφίας",
  editLocation: "Αλλαγή τοποθεσίας",
  editDetails: "Επιστροφή στη συζήτηση",
  submit: "Υποβολή αναφοράς",
  submitting: "Έλεγχος και υποβολή…",
  publishNote:
    "Το όνομα, η περιγραφή, η θέση στον χάρτη και η εγκεκριμένη φωτογραφία θα είναι δημόσια. Ισχύει η συνήθης εποπτεία κειμένου, φωτογραφίας και ανάθεση υπηρεσίας. Δεν αποστέλλεται συνεργείο.",
  success: "Η αναφορά σας είναι στον χάρτη της κοινότητας.",
  photoPending:
    "Η φωτογραφία μπορεί να παραμείνει ιδιωτική όσο εκκρεμεί ο έλεγχός της.",
  view: "Προβολή αναφοράς",
  another: "Αναφορά άλλου προβλήματος",
  quarantined:
    "Η αναφορά αποθηκεύτηκε για έλεγχο από επόπτη και δεν έχει δημοσιευτεί.",
  submitError:
    "Δεν επιβεβαιώθηκε η υποβολή. Το προσχέδιο παραμένει εδώ. Ελέγξτε τον χάρτη πριν δοκιμάσετε ξανά.",
  invalid:
    "Προσθέστε όνομα, περιγραφή, σημείο αναφοράς και έγκυρη τοποθεσία στην Πάφο.",
  record: "Ηχογράφηση φωνής",
  stop: "Διακοπή ηχογράφησης",
  recording: "Ηχογράφηση · έως 90 δευτερόλεπτα",
  starting: "Άνοιγμα μικροφώνου…",
  voiceNote:
    "Το πρόγραμμα περιήγησης μεταγράφει την ομιλία και μπορεί να χρησιμοποιεί υπηρεσία αναγνώρισης φωνής. Το DeepSeek λαμβάνει μόνο το κείμενο που στέλνετε. Η ηχογράφηση παραμένει στη σελίδα και δεν μεταφορτώνεται.",
  voiceUnsupported:
    "Η ηχογράφηση δεν υποστηρίζεται εδώ. Μπορείτε να γράψετε την περιγραφή σας.",
  transcriptUnavailable:
    "Η αυτόματη μεταγραφή δεν είναι διαθέσιμη εδώ. Ακούστε την ηχογράφηση και γράψτε την περιγραφή ή χρησιμοποιήστε την υπαγόρευση του πληκτρολογίου.",
  micError:
    "Το μικρόφωνο δεν ξεκίνησε. Ελέγξτε τις άδειες ή γράψτε την περιγραφή σας.",
  transcript: "Έλεγχος ή διόρθωση μεταγραφής",
  transcriptPlaceholder:
    "Η ομιλία σας θα εμφανιστεί εδώ. Μπορείτε επίσης να γράψετε.",
  useTranscript: "Χρήση αυτού του κειμένου",
  discard: "Απόρριψη ηχογράφησης",
  playback: "Η ηχογράφησή σας",
  emergency:
    "Για άμεσο κίνδυνο καλέστε το 112. Το FixPafos δεν είναι υπηρεσία έκτακτης ανάγκης.",
  newChat: "Νέα συζήτηση",
  restartConfirm: "Να διαγραφεί το προσχέδιο και να ξεκινήσουμε ξανά;",
  online: "Ο πειραματικός βοηθός χρειάζεται σύνδεση στο διαδίκτυο.",
};
const ru: Copy = {
  nav: "Сообщить с ИИ",
  experimental: "Эксперимент",
  title: "Сообщим о проблеме вместе.",
  intro:
    "Опишите, что вы заметили. Я задам несколько вопросов, затем помогу добавить фото и место на карте.",
  back: "Карта сообщества",
  standard: "Обычная форма",
  assistant: "Помощник FixPafos",
  you: "Вы",
  privacy:
    "Ваши сообщения отправляются в DeepSeek для подготовки черновика. Камера и геолокация включаются только по вашему выбору. Публикация произойдёт только после проверки и отправки вами.",
  steps: ["Описание", "Фото", "Место", "Имя", "Проверка"],
  greeting:
    "Что нужно исправить в вашем районе? Напишите описание или запишите голос. Расскажите, что вы видите и как это влияет на людей.",
  input: "Ваше сообщение",
  placeholder: "Например: повреждённый тротуар мешает пройти с коляской…",
  send: "Отправить сообщение",
  thinking: "Готовлю следующий шаг…",
  continue: "Продолжить с этим черновиком",
  retry: "Повторить",
  aiError:
    "Помощник не смог ответить. Ваш текст сохранён на странице. Повторите попытку или продолжите со своим описанием.",
  useOwn: "Продолжить со своим текстом",
  limit: "Проверим предоставленные сведения и продолжим.",
  photoPrompt:
    "Можете добавить фото проблемы? Откройте камеру или выберите готовый снимок. Фотографируйте только если это безопасно. Этот шаг необязателен.",
  camera: "Открыть камеру",
  capture: "Сделать фото",
  closeCamera: "Закрыть камеру",
  cameraStarting: "Открытие камеры…",
  cameraError:
    "Не удалось открыть камеру. Проверьте разрешения браузера или выберите фото ниже.",
  cameraPreview: "Предпросмотр камеры",
  photoContinue: "Использовать фото",
  photoSkip: "Продолжить без фото",
  photoAdded: "Фото прикреплено",
  photoSkipped: "Без фотографии",
  photoNote:
    "Фото остаётся на этой странице до отправки. Затем оно проходит обычную проверку ИИ и модератором перед публикацией.",
  locationPrompt:
    "Где находится проблема? Используйте GPS, если вы сейчас на месте, или выберите точку на карте. Укажите улицу или ближайший ориентир.",
  gps: "Использовать GPS",
  locating: "Определение местоположения…",
  map: "Выбрать на карте",
  locationConfirm: "Подтвердить место",
  locationNote:
    "GPS показывает ваше текущее положение, которое может отличаться от места проблемы. Проверьте метку перед продолжением.",
  gpsError:
    "Не удалось определить местоположение. Разрешите доступ или выберите точку на карте.",
  outside:
    "Эта точка за пределами зоны Пафоса. Выберите место проблемы на карте.",
  accuracy: "Точность GPS: примерно",
  metres: "м",
  landmark: "Улица или ближайший ориентир",
  landmarkPlaceholder: "Название улицы, перекрёсток или здание",
  coordinates: "Выбранные координаты",
  namePrompt:
    "Какое имя указать рядом с публичным сообщением? Можно использовать псевдоним. Не указывайте телефон или личные контактные данные.",
  name: "Публичное имя",
  nameContinue: "Проверить сообщение",
  reviewPrompt:
    "Ваше сообщение готово к проверке. Проверьте описание, фото и место. Текст можно изменить ниже. При отправке DeepSeek определит тип проблемы и предложит ответственную службу.",
  description: "Описание проблемы",
  aiDraft: "Черновик подготовлен с ИИ · проверьте его",
  ownDraft: "Черновик из ваших слов",
  editPhoto: "Изменить фото",
  editLocation: "Изменить место",
  editDetails: "Вернуться к беседе",
  submit: "Отправить сообщение",
  submitting: "Проверка и отправка…",
  publishNote:
    "Имя, описание, точка на карте и одобренное фото станут общедоступными. Действуют обычная модерация, проверка фото и назначение службы. Бригада автоматически не вызывается.",
  success: "Ваше сообщение на карте сообщества.",
  photoPending: "Фото может оставаться скрытым, пока идёт проверка.",
  view: "Посмотреть сообщение",
  another: "Сообщить о другой проблеме",
  quarantined:
    "Сообщение сохранено для проверки модератором и пока не опубликовано.",
  submitError:
    "Не удалось подтвердить отправку. Черновик остался здесь. Проверьте карту, прежде чем повторить попытку.",
  invalid: "Укажите имя, описание, ориентир и корректную точку в Пафосе.",
  record: "Записать голос",
  stop: "Остановить запись",
  recording: "Запись · до 90 секунд",
  starting: "Включение микрофона…",
  voiceNote:
    "Браузер преобразует речь в текст и может использовать свою службу распознавания. DeepSeek получает только отправленный вами текст. Аудиозапись остаётся на странице и не загружается.",
  voiceUnsupported:
    "Запись голоса недоступна в этом браузере. Введите описание текстом.",
  transcriptUnavailable:
    "Автоматическая расшифровка здесь недоступна. Прослушайте запись и введите описание или используйте диктовку клавиатуры.",
  micError:
    "Не удалось включить микрофон. Проверьте разрешения или введите описание.",
  transcript: "Проверьте или исправьте расшифровку",
  transcriptPlaceholder:
    "Ваши слова появятся здесь. Их также можно напечатать.",
  useTranscript: "Использовать этот текст",
  discard: "Удалить запись",
  playback: "Ваша голосовая запись",
  emergency:
    "При непосредственной опасности звоните 112. FixPafos — не экстренная служба.",
  newChat: "Начать заново",
  restartConfirm: "Удалить черновик и начать заново?",
  online: "Экспериментальному помощнику необходимо подключение к интернету.",
};

export const reportChatCopy: Record<Locale, Copy> = { en, el, ru };
