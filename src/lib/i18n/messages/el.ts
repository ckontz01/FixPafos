// Greek is the canonical dictionary: it defines the key set that every other
// locale must satisfy. Keys are flat dotted strings so that a missing or
// misspelt key is a compile-time error rather than a silent English fallback.
//
// Plural keys carry all four CLDR categories used across our locales
// (one/few/many/other). Greek and English never resolve to "few" or "many", so
// those entries simply repeat the general form; Russian uses all of them.
export const el = {
  "app.name": "PafosLive",
  "app.title": "PafosLive · Η γειτονιά σου, στον χάρτη",
  "app.description":
    "Δημόσια πλατφόρμα αναφοράς καθημερινών προβλημάτων στην Πάφο. Δηλώστε προβλήματα σε δρόμους, αποχέτευση, νερό και καθαριότητα, με προτεινόμενη αρμόδια υπηρεσία.",
  "app.independent": "Ανεξάρτητη πλατφόρμα πολιτών",

  "lang.label": "Γλώσσα",
  "lang.select": "Επιλογή γλώσσας",

  "nav.main": "Κύρια πλοήγηση",
  "nav.home": "Αρχική PafosLive",
  "nav.map": "Χάρτης κοινότητας",
  "nav.services": "Τοπικές υπηρεσίες",
  "nav.insights": "Στατιστικά",
  "nav.moderation": "Εποπτεία",
  "nav.report": "Αναφορά προβλήματος",
  "nav.location": "Πάφος, Κύπρος",

  "common.refresh": "Ανανέωση",
  "common.retry": "Δοκιμάστε ξανά",
  "common.cancel": "Ακύρωση",
  "common.pleaseWait": "Παρακαλώ περιμένετε…",
  "common.loading": "Φόρτωση…",
  "common.clearFilters": "Καθαρισμός φίλτρων",
  "common.all": "Όλα",
  "common.yes": "Ναι",
  "common.no": "Όχι",
  "common.justNow": "Μόλις τώρα",
  "common.minutesAgo": "πριν {count} λ.",
  "common.hoursAgo": "πριν {count} ώ.",
  "common.notAvailable": "—",

  "board.label": "Πίνακας κοινότητας",
  "board.kicker": "Η ΓΕΙΤΟΝΙΑ ΣΟΥ, ΣΥΝΔΕΔΕΜΕΝΗ",
  "board.title": "Μια καλύτερη Πάφος ξεκινά εδώ.",
  "board.subtitle":
    "Εντοπίστε ένα πρόβλημα. Μοιραστείτε το στον χάρτη. Παρακολουθήστε μαζί την πρόοδο.",
  "board.totals": "Σύνολα αναφορών κοινότητας",
  "board.openReports.one": "ανοικτή αναφορά",
  "board.openReports.few": "ανοικτές αναφορές",
  "board.openReports.many": "ανοικτές αναφορές",
  "board.openReports.other": "ανοικτές αναφορές",
  "board.resolvedCount": "επιλυμένες",
  "board.statusFilter": "Κατάσταση αναφοράς",
  "board.statusAll": "Όλες οι αναφορές",
  "board.search": "Αναζήτηση αναφορών",
  "board.searchPlaceholder": "Αναζήτηση αναφορών ή τοποθεσιών",
  "board.clearSearch": "Καθαρισμός αναζήτησης",
  "board.typeFilter": "Τύπος προβλήματος",
  "board.typeFilterAria": "Φιλτράρισμα τύπου προβλήματος",
  "board.allTypes": "Όλοι οι τύποι",
  "board.reportCount.one": "{count} αναφορά",
  "board.reportCount.few": "{count} αναφορές",
  "board.reportCount.many": "{count} αναφορές",
  "board.reportCount.other": "{count} αναφορές",
  "board.loadingReports": "Φόρτωση αναφορών…",
  "board.refreshAria": "Ανανέωση αναφορών",
  "board.loadErrorTitle": "Δεν ήταν δυνατή η φόρτωση του πίνακα",
  "board.updatesPaused": "Οι ενημερώσεις διακόπηκαν: {message}",
  "board.emptyMatchTitle": "Καμία αναφορά δεν ταιριάζει",
  "board.emptyMatchBody": "Δοκιμάστε άλλη αναζήτηση ή τύπο προβλήματος.",
  "board.emptyFirstTitle": "Γίνετε ο πρώτος που θα το βάλει στον χάρτη.",
  "board.emptyFirstBody":
    "Ένα σπασμένο πεζοδρόμιο. Ένα φραγμένο φρεάτιο. Ένα φανάρι που έσβησε. Ξεκινήστε από αυτό που βλέπετε.",
  "board.addFirst": "Προσθέστε την πρώτη αναφορά",
  "board.loadMore": "Φόρτωση περισσότερων αναφορών",
  "board.explainerTitle": "Μια μικρή αναφορά. Μια κοινή βελτίωση.",
  "board.explainerBody":
    "Από ένα χαλασμένο φωτιστικό σώμα μέχρι ένα φραγμένο φρεάτιο, βοηθήστε να μπουν οι ανάγκες της γειτονιάς σας στον χάρτη.",
  "board.supporting": "{count} υποστηρίζουν",
  "board.replies": "{count} απαντήσεις",

  "report.backToBoard": "Πίνακας κοινότητας",
  "report.title": "Τι χρειάζεται επιδιόρθωση;",
  "report.subtitle":
    "Μια σαφής περιγραφή και ακριβής τοποθεσία βοηθούν όλους να καταλάβουν το πρόβλημα.",
  "report.type": "Τύπος προβλήματος",
  "report.unsure": "Δεν είμαι σίγουρος/η",
  "report.autoClassifyNote":
    "Το σύστημα θα ταξινομήσει αυτόματα τον τύπο του προβλήματος και θα προτείνει την αρμόδια υπηρεσία από την περιγραφή και την τοποθεσία σας.",
  "report.locationChosen": "Η τοποθεσία επιλέχθηκε",
  "report.locationPrompt": "Επιλέξτε σημείο στον χάρτη",
  "report.locationChosenHint": "{coords} · πατήστε ξανά για μετακίνηση",
  "report.locationPromptHint":
    "Πατήστε το ακριβές σημείο ή χρησιμοποιήστε το κουμπί κέντρου χάρτη.",
  "report.landmark": "Οδός ή κοντινό σημείο αναφοράς",
  "report.landmarkPlaceholder": "π.χ. Λεωφόρος Αποστόλου Παύλου",
  "report.author": "Το όνομα ή το ψευδώνυμό σας",
  "report.authorPlaceholder": "Πώς θέλετε να εμφανίζεστε δημόσια",
  "report.message": "Τι συμβαίνει;",
  "report.messagePlaceholder":
    "Περιγράψτε το πρόβλημα και τι χρειάζεται προσοχή. Ελληνικά, English και Русский είναι ευπρόσδεκτα.",
  "report.privacyNote":
    "Το όνομα, η αναφορά και η τοποθεσία σας θα είναι δημόσια. Μην συμπεριλάβετε τηλέφωνα, διευθύνσεις κατοικίας ή άλλα προσωπικά στοιχεία.",
  "report.routingNote":
    "Θα προτείνουμε αυτόματα την αρμόδια υπηρεσία. Η δημοσίευση εδώ δεν αποστέλλει επίσημο αίτημα στην αρχή.",
  "report.submit": "Δημοσίευση αναφοράς",
  "report.submitting": "Έλεγχος και δρομολόγηση…",
  "report.finePrint":
    "Οι αναφορές ελέγχονται πριν τη δημοσίευση. Αν μια αναφορά μπλοκαριστεί, ένας επόπτης μπορεί να την εξετάσει.",
  "report.published":
    "Η αναφορά σας δημοσιεύτηκε και είναι ορατή σε όλους στον χάρτη.",
  "report.charCount": "{count}/500",

  "issue.backToAll": "Όλες οι αναφορές",
  "issue.reportedBy": "Αναφέρθηκε {time}",
  "issue.autoClassified": "Αυτόματη ταξινόμηση",
  "issue.suggestedService": "Προτεινόμενη αρμόδια υπηρεσία",
  "issue.assignmentLow":
    "Η αρμοδιότητα είναι ασαφής. Η δρομολόγηση χρειάζεται ανθρώπινο έλεγχο.",
  "issue.assignmentAuto":
    "Δρομολογήθηκε αυτόματα. Η αρμοδιότητα πρέπει να επιβεβαιωθεί από την υπηρεσία.",
  "issue.officialContact": "Επίσημη σελίδα επικοινωνίας",
  "issue.notSent": "Δεν έχει σταλεί στην αρχή.",
  "issue.support": "Το βλέπω και εγώ",
  "issue.supported": "Υποστηρίχθηκε",
  "issue.resolvedBy": "Χαρακτηρίστηκε επιλυμένο από {department} · {time}",
  "issue.photoPending": "Η φωτογραφία αναμένει έλεγχο από επόπτη.",
  "issue.photoAlt": "Αναφερόμενο πρόβλημα στη θέση {location}",

  "status.open": "Ανοικτό",
  "status.resolved": "✓ Επιλύθηκε",
  "status.openPlain": "Ανοικτό",
  "status.resolvedPlain": "Επιλύθηκε",

  "reply.heading": "Απαντήσεις κοινότητας",
  "reply.empty": "Προσθέστε χρήσιμες λεπτομέρειες ή μια ενημέρωση από την περιοχή.",
  "reply.author": "Το όνομα ή το ψευδώνυμό σας",
  "reply.add": "Προσθήκη απάντησης",
  "reply.placeholder": "Μοιραστείτε μια ενημέρωση…",
  "reply.finePrint": "Οι απαντήσεις είναι δημόσιες και ελέγχονται πριν τη δημοσίευση.",
  "reply.submit": "Δημοσίευση απάντησης",
  "reply.verified": "Επιβεβαιωμένη ομάδα",
  "reply.verifiedResolved": "Επιβεβαιωμένη ομάδα · Επιλύθηκε",
  "reply.verifiedTitle": "Δημοσιεύτηκε με τον κωδικό της υπηρεσίας στο PafosLive",

  "flag.action": "Επισήμανση ακατάλληλης αναφοράς",
  "flag.title": "Επισήμανση αυτής της αναφοράς;",
  "flag.body":
    "Η επισήμανση αποστέλλει την αναφορά για έλεγχο από επόπτη. Δεν διαγράφει αμέσως το περιεχόμενο άλλου πολίτη.",
  "flag.reason": "Λόγος επισήμανσης",
  "flag.reason.offensive": "Προσβλητικό ή υβριστικό περιεχόμενο",
  "flag.reason.spam": "Ανεπιθύμητο ή διαφημιστικό",
  "flag.reason.personal": "Περιέχει προσωπικά δεδομένα",
  "flag.reason.wrong": "Λανθασμένο ή παραπλανητικό",
  "flag.reason.other": "Άλλος λόγος",
  "flag.submit": "Αποστολή επισήμανσης",
  "flag.submitting": "Αποστολή…",
  "flag.received":
    "Ευχαριστούμε. Η επισήμανση καταγράφηκε και θα εξεταστεί από επόπτη.",
  "flag.hidden":
    "Η αναφορά αποκρύφθηκε προσωρινά από τον δημόσιο πίνακα και αναμένει έλεγχο.",
  "flag.alreadyFlagged": "Έχετε ήδη επισημάνει αυτή την αναφορά.",

  "team.panel": "Πρόσβαση ομάδας υπηρεσίας",
  "team.department": "Υπηρεσία",
  "team.password": "Κωδικός υπηρεσίας",
  "team.verify": "Επιβεβαίωση ομάδας",
  "team.verified": "Ο κωδικός της υπηρεσίας επιβεβαιώθηκε",
  "team.signOut": "Αποσύνδεση",
  "team.update": "Επίσημη ενημέρωση",
  "team.postReply": "Δημοσίευση επιβεβαιωμένης απάντησης",
  "team.resolve": "Χαρακτηρισμός ως επιλυμένο",
  "team.notAssigned":
    "Μόνο η αρμόδια υπηρεσία μπορεί να δημοσιεύσει επιβεβαιωμένη ενημέρωση.",

  "moderation.title": "Καραντίνα εποπτείας",
  "moderation.intro":
    "Εξετάστε υποβολές που μπλοκαρίστηκαν από το φίλτρο ή το μοντέλο. Οι εγκεκριμένες δημοσιεύονται στον κοινό πίνακα.",
  "moderation.password": "Κωδικός εποπτείας",
  "moderation.open": "Άνοιγμα καραντίνας",
  "moderation.checking": "Έλεγχος…",
  "moderation.awaiting": "{count} σε αναμονή ελέγχου",
  "moderation.lock": "Κλείδωμα",
  "moderation.emptyTitle": "Τίποτα σε αναμονή ελέγχου",
  "moderation.emptyBody":
    "Οι μπλοκαρισμένες αναφορές και απαντήσεις θα εμφανιστούν εδώ.",
  "moderation.approve": "Έγκριση και δημοσίευση",
  "moderation.published": "Δημοσιεύτηκε",
  "moderation.flagsTitle": "Επισημασμένες αναφορές",
  "moderation.flagsEmpty": "Καμία επισημασμένη αναφορά.",
  "moderation.flagCount": "{count} επισημάνσεις",
  "moderation.restore": "Επαναφορά στον πίνακα",
  "moderation.remove": "Οριστική απόκρυψη",
  "moderation.clusterTitle": "Προτεινόμενα διπλότυπα",
  "moderation.clusterEmpty": "Καμία εκκρεμής πρόταση ομαδοποίησης.",
  "moderation.clusterConfirm": "Επιβεβαίωση σύνδεσης",
  "moderation.clusterSeparate": "Αποσύνδεση",

  "photo.label": "Φωτογραφία (προαιρετικά)",
  "photo.choose": "Επιλογή φωτογραφίας",
  "photo.remove": "Αφαίρεση φωτογραφίας",
  "photo.hint":
    "JPEG, PNG ή WebP, έως 4 MB. Τα δεδομένα τοποθεσίας αφαιρούνται.",
  "photo.approved": "Φωτογραφία · εγκρίθηκε",
  "photo.rejected": "Φωτογραφία · απορρίφθηκε",
  "photo.pending": "Φωτογραφία · σε αναμονή",
  "photo.approve": "Έγκριση φωτογραφίας",
  "photo.reject": "Απόρριψη φωτογραφίας",
  "photo.view": "Προβολή ιδιωτικής φωτογραφίας",
  "photo.reviewTitle": "Έλεγχος φωτογραφιών",

  "severity.label": "Σοβαρότητα",
  "severity.critical": "Κρίσιμη",
  "severity.high": "Υψηλή",
  "severity.medium": "Μεσαία",
  "severity.low": "Χαμηλή",
  "severity.advisory":
    "Εκτίμηση από μοντέλο ως βοήθημα προτεραιοποίησης. Δεν αποτελεί επίσημη απόφαση του Δήμου.",
  "severity.why": "Γιατί αυτή η εκτίμηση;",
  "severity.slaSuggested": "Προτεινόμενος χρόνος ανταπόκρισης: {window}",
  "severity.sla.critical": "εντός 4 ωρών",
  "severity.sla.high": "εντός 2 εργάσιμων ημερών",
  "severity.sla.medium": "εντός 10 εργάσιμων ημερών",
  "severity.sla.low": "εντός 30 εργάσιμων ημερών",
  "severity.needsReview": "Χρειάζεται ανθρώπινο έλεγχο",
  "severity.factor.danger": "Άμεσος κίνδυνος για ανθρώπους",
  "severity.factor.infrastructure": "Επίπτωση σε υποδομές",
  "severity.factor.accessibility": "Επίπτωση στην προσβασιμότητα",
  "severity.factor.traffic": "Διατάραξη κυκλοφορίας",
  "severity.factor.environment": "Περιβαλλοντική επίπτωση",
  "severity.factor.people": "Αριθμός επηρεαζόμενων πολιτών",
  "severity.factor.escalation": "Κίνδυνος επιδείνωσης",
  "severity.factor.recurrence": "Επαναλαμβανόμενο πρόβλημα",

  "cluster.label": "Συνδεδεμένες αναφορές",
  "cluster.count.one": "{count} αναφορά πολίτη",
  "cluster.count.few": "{count} αναφορές πολιτών",
  "cluster.count.many": "{count} αναφορές πολιτών",
  "cluster.count.other": "{count} αναφορές πολιτών",
  "cluster.explain":
    "Αυτές οι αναφορές φαίνεται να αφορούν το ίδιο φυσικό πρόβλημα. Κάθε αναφορά διατηρείται ξεχωριστά.",
  "cluster.why": "Γιατί συνδέθηκαν;",
  "cluster.distance": "Απόσταση {metres} μ.",
  "cluster.pendingReview": "Πιθανό διπλότυπο — αναμένει έλεγχο",
  "cluster.separated": "Αποσυνδέθηκε από τον επόπτη",
  "cluster.viewOriginal": "Προβολή αρχικής αναφοράς",

  "insights.title": "Επιχειρησιακά στατιστικά",
  "insights.subtitle":
    "Λειτουργική εικόνα των δημόσιων αναφορών της Πάφου. Όλοι οι αριθμοί προέρχονται από πραγματικά δεδομένα της βάσης.",
  "insights.demoBanner":
    "Εμφανίζονται δεδομένα επίδειξης. Δεν πρόκειται για πραγματικές αναφορές πολιτών.",
  "insights.totalReports": "Συνολικές αναφορές",
  "insights.activeIssues": "Ενεργά προβλήματα",
  "insights.resolvedIssues": "Επιλυμένα",
  "insights.resolutionRate": "Ποσοστό επίλυσης",
  "insights.avgResolution": "Μέσος χρόνος επίλυσης",
  "insights.medianResolution": "Διάμεσος χρόνος επίλυσης",
  "insights.byCategory": "Αναφορές ανά κατηγορία",
  "insights.byDepartment": "Αναφορές ανά υπηρεσία",
  "insights.byStatus": "Αναφορές ανά κατάσταση",
  "insights.bySeverity": "Αναφορές ανά σοβαρότητα",
  "insights.overTime": "Αναφορές με την πάροδο του χρόνου",
  "insights.hotspots": "Γεωγραφικά σημεία συγκέντρωσης",
  "insights.recurring": "Επαναλαμβανόμενες τοποθεσίες",
  "insights.clusters": "Μεγέθη ομάδων διπλοτύπων",
  "insights.departmentPerformance": "Απόδοση ανταπόκρισης υπηρεσιών",
  "insights.seasonal": "Εποχικά μοτίβα",
  "insights.filters": "Φίλτρα",
  "insights.dateFrom": "Από",
  "insights.dateTo": "Έως",
  "insights.noData": "Δεν υπάρχουν αρκετά δεδομένα για αυτό το διάστημα.",
  "insights.export": "Εξαγωγή CSV",
  "insights.exportDigest": "Ενημερωτικό δελτίο υπηρεσίας",
  "insights.days": "{count} ημέρες",
  "insights.hours": "{count} ώρες",
  "insights.reportsUnit": "αναφορές",
  "insights.openLink": "Άνοιγμα στατιστικών",


  "map.label": "Δημόσιος χάρτης προβλημάτων Πάφου",
  "map.pickPrompt": "Πατήστε τον χάρτη για να τοποθετήσετε την αναφορά",
  "map.tagline": "Η γειτονιά σου, στον χάρτη",
  "map.loading": "Φόρτωση δρόμων της Πάφου…",
  "map.opening": "Άνοιγμα του χάρτη της Πάφου…",
  "map.moveToPafos": "Μετακινήστε τον χάρτη στην Πάφο πριν επιλέξετε τοποθεσία.",
  "map.noGeolocation":
    "Το πρόγραμμα περιήγησης δεν υποστηρίζει εντοπισμό. Επιλέξτε σημείο στον χάρτη.",
  "map.outsideArea":
    "Βρίσκεστε εκτός της περιοχής αναφορών της Πάφου. Επιλέξτε σημείο στον χάρτη.",
  "map.locationUnavailable":
    "Η πρόσβαση στην τοποθεσία δεν ήταν διαθέσιμη. Μπορείτε να επιλέξετε σημείο στον χάρτη.",
  "map.useMyLocation": "Χρήση της τοποθεσίας μου",
  "map.reset": "Επαναφορά χάρτη Πάφου",
  "map.dismiss": "Απόρριψη μηνύματος χάρτη",
  "map.panHint": "Μετακινήστε ή κάντε ζουμ στο ακριβές σημείο.",
  "map.useCentre": "Χρήση κέντρου χάρτη",
  "map.publicReports.one": "{count} δημόσια αναφορά σε αυτόν τον χάρτη",
  "map.publicReports.few": "{count} δημόσιες αναφορές σε αυτόν τον χάρτη",
  "map.publicReports.many": "{count} δημόσιες αναφορές σε αυτόν τον χάρτη",
  "map.publicReports.other": "{count} δημόσιες αναφορές σε αυτόν τον χάρτη",
  "map.selectPin": "Επιλέξτε μια πινέζα για ανάγνωση",
  "map.resolvedPrefix": "Επιλύθηκε · ",


  "team.access": "Πρόσβαση ομάδας",
  "team.replyPlaceholder": "Εξηγήστε τι έκανε ή τι θα κάνει η ομάδα σας…",
  "team.resolvedState": "Επιλύθηκε",
  "team.updateHint":
    "Προσθέστε ενημέρωση πριν την επίλυση. Οι επιβεβαιωμένες απαντήσεις περνούν τους ίδιους ελέγχους με τις απαντήσεις κοινότητας.",
  "team.signOutFull": "Αποσύνδεση από την πρόσβαση ομάδας",
  "team.otherTeam":
    "Είστε επιβεβαιωμένοι ως {department}. Αυτό το ζήτημα ανήκει σε άλλη ομάδα.",
  "team.eligibility":
    "Για εξουσιοδοτημένους εκπροσώπους με κωδικό που εκδόθηκε από το PafosLive. Η επιβεβαίωση πιστοποιεί πρόσβαση στην πλατφόρμα, όχι εργασιακή σχέση.",
  "team.replyNotice": "Η επιβεβαιωμένη απάντηση δημοσιεύτηκε.",
  "team.resolveNotice": "Το ζήτημα χαρακτηρίστηκε επιλυμένο. Η ενημέρωσή σας είναι δημόσια.",
  "team.unavailable": "Η επιβεβαίωση ομάδας δεν είναι προσωρινά διαθέσιμη.",

  "photo.previewAlt": "Προεπισκόπηση επιλεγμένης φωτογραφίας",
  "photo.pickerHint":
    "JPEG, PNG ή WebP, έως 4 MB. Η φωτογραφία ελέγχεται αυτόματα σε σχέση με την αναφορά. Καθαρές, σχετικές και ασφαλείς φωτογραφίες εγκρίνονται αυτόματα· οι υπόλοιπες παραμένουν ιδιωτικές για έλεγχο. Αποφύγετε πρόσωπα, πινακίδες και προσωπικά στοιχεία.",
  "photo.invalidChoice": "Επιλέξτε φωτογραφία JPEG, PNG ή WebP έως 4 MB.",
  "photo.noneToReview": "Δεν υπάρχουν φωτογραφίες για έλεγχο.",


  "moderation.photoIntro":
    "Οι σαφώς σχετικές και ασφαλείς φωτογραφίες εγκρίνονται αυτόματα. Αβέβαιες, άσχετες, ακατάλληλες ή ευαίσθητες φωτογραφίες και αποτυχημένοι αυτόματοι έλεγχοι παραμένουν ιδιωτικά εδώ, με τις εκκρεμείς πρώτες. Ελέγξτε την εικόνα πριν την έγκριση. Οι φωτογραφίες δημοσιεύονται μόνο όταν δημοσιευτεί και η αναφορά τους.",
  "moderation.refreshPhotos": "Ανανέωση φωτογραφιών",
  "moderation.quarantineMeta": "{type} · {status} · {blockedBy} / {category}",
  "photo.awaitingAlt": "Φωτογραφία σε αναμονή ελέγχου",
  "photo.autoApproved": "Εγκρίθηκε αυτόματα. ",
  "photo.reviewedByModerator": "Ελέγχθηκε από επόπτη. ",
  "photo.needsReview": "Χρειάζεται έλεγχο από επόπτη. ",
  "photo.aiAssessment": "Αυτόματη εκτίμηση: {category} (εμπιστοσύνη: {confidence}). ",
  "photo.noAssessment": "Δεν υπάρχει αυτόματη εκτίμηση για αυτή τη φωτογραφία.",


  "insights.showTable": "Προβολή πίνακα",
  "insights.showChart": "Προβολή γραφήματος",
  "insights.opened": "Νέες",
  "insights.resolvedSeries": "Επιλυμένες",
  "insights.allCategories": "Όλες οι κατηγορίες",
  "insights.allDepartments": "Όλες οι υπηρεσίες",
  "insights.allSeverities": "Όλες οι σοβαρότητες",
  "insights.allStatuses": "Όλες οι καταστάσεις",
  "insights.apply": "Εφαρμογή",
  "insights.reset": "Επαναφορά",
  "insights.metric": "Μέγεθος",
  "insights.value": "Τιμή",
  "insights.location": "Τοποθεσία",
  "insights.department": "Υπηρεσία",
  "insights.category": "Κατηγορία",
  "insights.count": "Πλήθος",
  "insights.medianLabel": "Διάμεσος",
  "insights.clusterLabel": "Ομάδα",
  "insights.size": "Μέγεθος",
  "insights.day": "Ημέρα",
  "insights.month": "Μήνας",
  "insights.noReports": "Δεν υπάρχουν ακόμη αναφορές για ανάλυση.",
  "insights.backToMap": "Επιστροφή στον χάρτη",
  "insights.method":
    "Κάθε αριθμός υπολογίζεται από αποθηκευμένες αναφορές. Οι αποκρυμμένες αναφορές εξαιρούνται. Τίποτα δεν εκτιμάται ή συμπληρώνεται.",
  "insights.last30": "Τελευταίες 30 ημέρες",
  "insights.last90": "Τελευταίες 90 ημέρες",
  "insights.last365": "Τελευταίος χρόνος",
  "insights.allTime": "Όλο το διάστημα",
  "insights.period": "Περίοδος",
  "insights.hoursUnit": "ώ.",
  "insights.daysUnit": "ημ.",

  "a11y.skipToContent": "Μετάβαση στο περιεχόμενο",
  "a11y.mapLabel": "Διαδραστικός χάρτης αναφορών Πάφου",
  "a11y.mapAlternative": "Λίστα αναφορών (εναλλακτική του χάρτη)",
  "a11y.useMapCentre": "Χρήση κέντρου χάρτη",
  "a11y.locateMe": "Εντοπισμός της θέσης μου",
  "a11y.selectedIssue": "Επιλεγμένη αναφορά: {title}",

  "voice.start": "Υπαγόρευση αναφοράς",
  "voice.stop": "Διακοπή υπαγόρευσης",
  "voice.listening": "Ακούω…",
  "voice.review":
    "Ελέγξτε και διορθώστε το κείμενο πριν την υποβολή. Τίποτα δεν υποβάλλεται αυτόματα.",
  "voice.unsupported":
    "Η υπαγόρευση δεν υποστηρίζεται σε αυτό το πρόγραμμα περιήγησης.",
  "voice.error":
    "Η υπαγόρευση δεν ολοκληρώθηκε. Δοκιμάστε ξανά ή πληκτρολογήστε.",

  "offline.queued":
    "Δεν υπάρχει σύνδεση. Η αναφορά αποθηκεύτηκε τοπικά και δεν έχει υποβληθεί ακόμη.",
  "offline.pending.one": "{count} αναφορά σε αναμονή αποστολής",
  "offline.pending.few": "{count} αναφορές σε αναμονή αποστολής",
  "offline.pending.many": "{count} αναφορές σε αναμονή αποστολής",
  "offline.pending.other": "{count} αναφορές σε αναμονή αποστολής",
  "offline.sending": "Αποστολή αναφορών σε αναμονή…",
  "offline.sent": "Οι αναφορές σε αναμονή υποβλήθηκαν.",
  "offline.notSubmitted": "Δεν έχει υποβληθεί ακόμη",
  "offline.discard": "Απόρριψη",

  "translation.original": "Αρχικό κείμενο πολίτη",
  "translation.machine": "Αυτόματη μετάφραση",
  "translation.showOriginal": "Εμφάνιση αρχικού",
  "translation.showTranslation": "Εμφάνιση μετάφρασης",
  "translation.notice":
    "Αυτόματη μετάφραση για υπηρεσιακή χρήση. Το αρχικό κείμενο του πολίτη υπερισχύει.",
  "translation.detected": "Γλώσσα αναφοράς: {language}",

  "demo.banner":
    "Λειτουργία επίδειξης: τα δεδομένα είναι δείγμα και οι αυτόματοι έλεγχοι ενδέχεται να εκτελούνται τοπικά.",
  "demo.aiUnavailable":
    "Η υπηρεσία μοντέλου δεν είναι διαθέσιμη. Χρησιμοποιείται ντετερμινιστική εφεδρική ταξινόμηση και επισημαίνεται ως τέτοια.",
  "demo.seeded": "Δεδομένα επίδειξης",

  "category.roads": "Δρόμοι και πεζοδρόμια",
  "category.sewage": "Αποχέτευση και ομβρια",
  "category.water": "Ύδρευση",
  "category.waste": "Απορρίμματα και καθαριότητα",
  "category.lighting": "Δημοτικός φωτισμός",
  "category.parks": "Πάρκα και πράσινο",
  "category.traffic": "Κυκλοφορία και στάθμευση",
  "category.other": "Άλλο τοπικό ζήτημα",

  "department.technical": "Δήμος Πάφου · Τεχνικές Υπηρεσίες",
  "department.sewerage": "ΣΑΠΑ · Αποχέτευση και Ομβρια",
  "department.water": "ΣΑΠΑ · Υδατοπρομήθεια",
  "department.cleaning": "Δήμος Πάφου · Υπηρεσία Καθαριότητας",
  "department.green": "Δήμος Πάφου · Υπηρεσία Πρασίνου",
  "department.traffic": "Δήμος Πάφου · Υπηρεσία Κυκλοφορίας",
  "department.health": "Δήμος Πάφου · Υγειονομική Υπηρεσία",
  "department.review": "Δήμος Πάφου · Γενικές πληροφορίες",

  "departmentRemit.technical":
    "Δημοτικοί δρόμοι, λακκούβες, πεζοδρόμια, προσβασιμότητα, δημόσιες υποδομές και δημοτικός φωτισμός. Οι μεγάλοι αυτοκινητόδρομοι ενδέχεται να παραπεμφθούν στα Δημόσια Έργα.",
  "departmentRemit.sewerage":
    "Φραγμοί δημόσιου αποχετευτικού, διαρροές λυμάτων και βλάβες δικτύου ομβρίων.",
  "departmentRemit.water":
    "Διαρροές δημόσιας υδατοπρομήθειας, διακοπές παροχής και βλάβες δικτύου νερού.",
  "departmentRemit.cleaning":
    "Μη αποκομιδή απορριμμάτων, σκουπίδια, παράνομη απόρριψη και καθαριότητα οδών.",
  "departmentRemit.green":
    "Δημοτικά πάρκα, δέντρα, ανεξέλεγκτη βλάστηση και χώροι πρασίνου.",
  "departmentRemit.traffic":
    "Δημοτική στάθμευση και τοπικά κυκλοφοριακά παράπονα. Τα οδικά έργα πηγαίνουν στις Τεχνικές Υπηρεσίες.",
  "departmentRemit.health":
    "Δημόσια υγιεινή, επιβλαβείς οργανισμοί και θέματα καθαριότητας εκτός βλαβών αποχέτευσης.",
  "departmentRemit.review":
    "Ασαφή, μεικτά ή εκτός αρμοδιότητας ζητήματα που χρειάζονται ανθρώπινη δρομολόγηση. Δεν αποτελεί επιβεβαίωση αρμοδιότητας.",

  "services.kicker": "ΜΑΘΕΤΕ ΠΟΙΟΝ ΝΑ ΚΑΛΕΣΕΤΕ",
  "services.title": "Τοπικές υπηρεσίες.",
  "services.subtitle": "Βρείτε την ομάδα που φροντίζει τη γειτονιά σας.",
  "services.note":
    "Οι αναφορές λαμβάνουν προτεινόμενη υπηρεσία. Για επίσημο αίτημα, επικοινωνήστε απευθείας με την αρχή.",
  "services.disclaimer":
    "Τα επίσημα λογότυπα προσδιορίζουν κάθε υπηρεσία. Το PafosLive είναι ανεξάρτητη πλατφόρμα πολιτών.",

  "error.generic": "Το αίτημα απέτυχε. Δοκιμάστε ξανά.",
  "error.unavailable":
    "Ο πίνακας κοινότητας δεν είναι προσωρινά διαθέσιμος. Δοκιμάστε ξανά.",
  "error.crossOrigin": "Το αίτημα απορρίφθηκε.",
  "error.invalidReport":
    "Προσθέστε όνομα (έως 40 χαρακτήρες), περιγραφή (έως 500), κατηγορία και τοποθεσία εντός Πάφου.",
  "error.invalidReply": "Προσθέστε όνομα και απάντηση έως 500 χαρακτήρες.",
  "error.invalidIssue": "Μη έγκυρη αναφορά.",
  "error.notFound": "Η αναφορά δεν βρέθηκε.",
  "error.rateLimited": "Πάρα πολλές υποβολές. Περιμένετε ένα λεπτό.",
  "error.rateLimitedFlag": "Περιμένετε ένα λεπτό πριν επισημάνετε ξανά.",
  "error.rateLimitedVote": "Περιμένετε ένα λεπτό πριν ψηφίσετε ξανά.",
  "error.rateLimitedLogin":
    "Πάρα πολλές προσπάθειες επιβεβαίωσης. Δοκιμάστε σε 15 λεπτά.",
  "error.moderationBlocked":
    "Η αναφορά δεν δημοσιεύτηκε γιατί ενδέχεται να περιέχει ακατάλληλο περιεχόμενο. Αποθηκεύτηκε για έλεγχο από επόπτη.",
  "error.moderationBlockedReply":
    "Η απάντηση δεν δημοσιεύτηκε γιατί ενδέχεται να περιέχει ακατάλληλο περιεχόμενο. Αποθηκεύτηκε για έλεγχο από επόπτη.",
  "error.moderationUnavailable":
    "Δεν ήταν δυνατός ο έλεγχος αυτή τη στιγμή. Δοκιμάστε ξανά.",
  "error.assignmentUnavailable":
    "Η δρομολόγηση σε υπηρεσία δεν είναι προσωρινά διαθέσιμη. Η αναφορά δεν δημοσιεύτηκε· δοκιμάστε ξανά.",
  "error.photoTooLarge": "Επιλέξτε φωτογραφία μικρότερη από 4 MB.",
  "error.photoInvalid":
    "Επιλέξτε έγκυρη φωτογραφία JPEG, PNG ή WebP, έως 4 MB και 25 megapixel.",
  "error.teamUnauthorized": "Επιβεβαιώστε πρώτα την υπηρεσία σας.",
  "error.teamForbidden":
    "Μόνο η αρμόδια υπηρεσία μπορεί να δώσει επιβεβαιωμένη ενημέρωση ή να επιλύσει το ζήτημα.",
  "error.teamBadPassword": "Λανθασμένος κωδικός υπηρεσίας.",
  "error.alreadyResolved": "Το ζήτημα έχει ήδη επιλυθεί.",
  "error.conflict": "Το ζήτημα άλλαξε. Ανανεώστε πριν δοκιμάσετε ξανά.",
  "error.moderationPassword": "Λανθασμένος κωδικός εποπτείας.",
  "error.moderationNotConfigured": "Η πρόσβαση εποπτείας δεν έχει ρυθμιστεί.",
  "error.updateLength": "Προσθέστε ενημέρωση 1–500 χαρακτήρων.",
} as const;

export type MessageKey = keyof typeof el;
// Literal values widen to string so other locales only have to match the keys.
export type Messages = Record<MessageKey, string>;
