/**
 * Centralized UI strings for the application.
 * This makes it easier to maintain consistent messaging and enables future i18n.
 */

export const Strings = {
    // ============================================================================
    // Common
    // ============================================================================
    common: {
        loading: 'Laden...',
        save: 'Opslaan',
        cancel: 'Annuleren',
        delete: 'Verwijderen',
        edit: 'Bewerken',
        add: 'Toevoegen',
        done: 'Klaar',
        error: 'Fout',
        success: 'Succes',
        yes: 'Ja',
        no: 'Nee',
    },

    // ============================================================================
    // Auth
    // ============================================================================
    auth: {
        login: 'Inloggen',
        logout: 'Uitloggen',
        register: 'Registreren',
        welcomeBack: 'Welkom terug!',
        loginSubtitle: 'Log in om verder te gaan.',
        registerTitle: 'Maak een account',
        registerSubtitle: 'Start met het organiseren van je huis.',
        email: 'Email',
        password: 'Wachtwoord',
        confirmPassword: 'Wachtwoord bevestigen',
        username: 'Gebruikersnaam',
        birthdate: 'Geboortedatum',
        noAccount: 'Nog geen account?',
        hasAccount: 'Heb je al een account?',
        registerHere: 'Registreer hier',
        loginHere: 'Log in',
        logoutConfirmTitle: 'Uitloggen',
        logoutConfirmMessage: 'Weet je zeker dat je wilt uitloggen?',
        accountCreated: 'Account aangemaakt! Je bent nu ingelogd.',
        accountError: 'Account Fout',
        profileNotFound: 'Je gebruikersprofiel is niet gevonden. Registreer opnieuw.',
        passwordMinLength: 'Minimaal 6 tekens',
        passwordMismatch: 'Wachtwoorden komen niet overeen',
        fillAllFields: 'Vul alle verplichte velden in.',
        birthdateMustBePast: 'Geboortedatum moet in het verleden liggen.',
    },

    // ============================================================================
    // Household
    // ============================================================================
    household: {
        noHouseFound: 'Geen huis gevonden',
        notMemberYet: 'Je bent nog geen lid van een huis.',
        createHouse: 'Huis Aanmaken',
        joinHouse: 'Huis Joinen',
        notMemberMessage: 'Je bent nog geen lid van een huis. Ga naar het dashboard om een huis te maken of te joinen.',
        settings: 'Instellingen',
        houseInfo: 'Huis Info',
    },

    // ============================================================================
    // Groceries
    // ============================================================================
    groceries: {
        title: 'Boodschappen',
        addItemPlaceholder: 'Nieuw item toevoegen...',
        emptyList: 'De boodschappenlijst is leeg.',
        mustBeMember: 'Je moet lid zijn van een huis om items toe te voegen.',
        addError: 'Kon item niet toevoegen.',
        deleteError: 'Kon item niet verwijderen.',
        updateError: 'Kon item niet bijwerken.',
        cannotDeletePinned: 'Gepinde items kunnen niet verwijderd worden. Maak ze eerst los.',
        outOfStock: 'Op!',
        outOfStockMessage: (itemName: string) => `${itemName} is op!`,
        notificationSent: 'Melding verstuurd',
        notificationSentMessage: (itemName: string) => `Huisgenoten zijn gewaarschuwd dat ${itemName} op is.`,
        notificationError: 'Kon melding niet versturen.',
    },

    // ============================================================================
    // Dashboard
    // ============================================================================
    dashboard: {
        title: 'Homepage',
        recentAlerts: 'Recente Meldingen',
        noAlerts: 'Geen recente meldingen.',
        resolveAlert: 'Melding afhandelen',
        resolveAlertConfirm: 'Wil je deze melding afvinken?',
        markAsDone: 'Afvinken',
        today: 'Vandaag',
        yesterday: 'Gisteren',
    },

    // ============================================================================
    // User Settings
    // ============================================================================
    userSettings: {
        title: 'Instellingen',
        profileSection: 'Profiel Bewerken',
        accountSection: 'Account',
        profilePhotoUrl: 'Profiel Foto URL',
        profilePhotoPlaceholder: 'https://example.com/foto.jpg',
        profileUpdateSuccess: 'Profiel bijgewerkt!',
        profileUpdateError: 'Kon profiel niet opslaan.',
    },

    // ============================================================================
    // Chat
    // ============================================================================
    chat: {
        title: 'Chat',
        messagePlaceholder: 'Typ een bericht...',
        emptyChat: 'Nog geen berichten.',
    },

    // ============================================================================
    // Chores
    // ============================================================================
    chores: {
        title: 'Huishouden',
        taskList: 'Takenlijst',
        addTask: 'Nieuwe taak toevoegen...',
        emptyTasks: 'Geen taken voor deze dag.',
        assignTask: 'Taak Toewijzen',
        selectMember: 'Selecteer een huisgenoot',
    },

    // ============================================================================
    // Agenda
    // ============================================================================
    agenda: {
        title: 'Agenda',
        noEvents: 'Geen evenementen gepland.',
    },

    // ============================================================================
    // Finances
    // ============================================================================
    finances: {
        title: 'Financiën',
        balance: 'Balans',
        youOwe: 'Je bent verschuldigd',
        owesYou: 'Is verschuldigd aan jou',
    },

    // ============================================================================
    // Errors
    // ============================================================================
    errors: {
        generic: 'Er is iets misgegaan. Probeer het opnieuw.',
        networkError: 'Controleer je internetverbinding.',
        sessionExpired: 'Je sessie is verlopen. Log opnieuw in.',
        unauthorized: 'Je hebt geen toegang tot deze functie.',
    },
} as const;

export default Strings;
