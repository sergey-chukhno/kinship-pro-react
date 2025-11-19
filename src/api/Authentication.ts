import axiosClient from "./config";

interface formData {
    email: string;
    password: string;
    passwordConfirmation?: string;
    firstName?: string;
    lastName?: string;
    birthday?: string;
    role?: string;
    job?: string;
    takeTrainee?: boolean;
    proposeWorkshop?: boolean;
    showMySkills?: boolean;
    availability?: any;
    selectedSkills?: number[];
    selectedSubSkills?: number[];
    selectedSchools?: string[];
    selectedCompanies?: string[];
    schoolName?: string;
    schoolAddress?: string;
    schoolCity?: string;
    schoolZipCode?: string;
    uaiCode?: string;
    companyName?: string;
    companyDescription?: string;
    companyTypeId?: number;
    companyZipCode?: string;
    companyCity?: string;
    companyEmail?: string;
    siretNumber?: number;
    website?: string
    referentPhoneNumber?: string;
    acceptPrivacyPolicy?: boolean;
    parentCompanyId?: string;
    branchRequestToCompanyId?: number;
    childFirstName?: string;
    childLastName?: string;
    childBirthday?: string;
    hasTemporaryEmail?: boolean; // <--- NOUVEAU CHAMP
}

export function login(email: string, password: string) {
    return axiosClient.post("/api/v1/auth/login", { email, password });
}

export function submitPersonalUserRegistration(formData: formData) {
    return axiosClient.post('/api/v1/auth/register', {
        registration_type: "personal_user",  // ← Explicitly set
        user: {
            email: formData.email,              // Non-academic
            password: formData.password,
            password_confirmation: formData.passwordConfirmation,
            first_name: formData.firstName,
            last_name: formData.lastName,
            birthday: formData.birthday,
            role: formData.role,                // parent, grand-parent, voluntary, etc.
            job: formData.job,
            take_trainee: formData.takeTrainee,
            propose_workshop: formData.proposeWorkshop || false,
            show_my_skills: true,
            accept_privacy_policy: formData.acceptPrivacyPolicy || false,
            company_name: formData.companyName,
            has_temporary_email: formData.hasTemporaryEmail
        },
        availability: formData.availability,
        skills: {
            skill_ids: formData.selectedSkills,
            sub_skill_ids: formData.selectedSubSkills
        },
        join_school_ids: formData.selectedSchools,
        join_company_ids: formData.selectedCompanies,
        children_info: {
            first_name: formData.childFirstName,
            last_name: formData.childLastName,
            birthday: formData.childBirthday,
        }
    });
}

export function submitTeacherRegistration(formData: formData) {
    return axiosClient.post('/api/v1/auth/register', {
        registration_type: "teacher",        // ← Explicitly set
        user: {
            email: formData.email,              // MUST be academic
            password: formData.password,
            password_confirmation: formData.passwordConfirmation,
            first_name: formData.firstName,
            last_name: formData.lastName,
            birthday: formData.birthday,
            role: formData.role,                // school_teacher, college_lycee_professor, etc.
            show_my_skills: true,
            accept_privacy_policy: formData.acceptPrivacyPolicy || false
        },
        availability: formData.availability,
        join_school_ids: formData.selectedSchools,
        skills: {
            skill_ids: formData.selectedSkills,
            sub_skill_ids: formData.selectedSubSkills
        },
    });
}

export function submitSchoolRegistration(formData: formData) {
    return axiosClient.post('/api/v1/auth/register', {
        registration_type: "school",         // ← Explicitly set
        user: {
            email: formData.email,              // MUST be academic
            password: formData.password,
            password_confirmation: formData.passwordConfirmation,
            first_name: formData.firstName,
            last_name: formData.lastName,
            birthday: formData.birthday,
            role: formData.role,                 // school_director, principal, etc.
            accept_privacy_policy: formData.acceptPrivacyPolicy
        },
        school: {
            name: formData.schoolName,
            city: formData.schoolCity,
            zip_code: formData.schoolZipCode,
            referent_phone_number: formData.referentPhoneNumber || null,
            uai_code: formData.uaiCode,
        }
    });
}

export function submitCompanyRegistration(formData: formData) {
    return axiosClient.post('/api/v1/auth/register', {
        registration_type: "company",        // ← Explicitly set
        user: {
            email: formData.email,              // Any email (NOT academic)
            password: formData.password,
            password_confirmation: formData.passwordConfirmation,
            first_name: formData.firstName,
            last_name: formData.lastName,
            birthday: formData.birthday,
            role: formData.role,          // company_director, association_president, etc.
            accept_privacy_policy: formData.acceptPrivacyPolicy
        },
        company: {
            name: formData.companyName,
            show_my_skills: true,
            description: formData.companyDescription,
            company_type_id: formData.companyTypeId,
            zip_code: formData.companyZipCode,
            city: formData.companyCity,
            referent_phone_number: formData.referentPhoneNumber || null,
            email:formData.companyEmail, // NEW
            siret_number: formData.siretNumber, // NEW
            website: formData.website, //NEW
            take_trainee: formData.takeTrainee,
            propose_workshop: formData.proposeWorkshop || false,
        },
        skills: {
            skill_ids: formData.selectedSkills,
            sub_skill_ids: formData.selectedSubSkills
        },
    });
}

export function getCurrentUser() {
    return axiosClient.get('/api/v1/auth/me');
}

export function refreshToken() {
    return axiosClient.post('/api/v1/auth/refresh');
}

export function logout() {
    return axiosClient.post('/api/v1/auth/logout');
}