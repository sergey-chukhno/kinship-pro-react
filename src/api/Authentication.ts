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
    selectedSchools?: number[];
    selectedCompanies?: number[];
    selectedSchoolsList?: Array<{ id: number; name: string }>;
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
    siretNumber?: string;
    website?: string
    referentPhoneNumber?: string;
    acceptPrivacyPolicy?: boolean;
    parentCompanyId?: string;
    branchRequestToCompanyId?: number;
    childFirstName?: string;
    childLastName?: string;
    childBirthday?: string;
    hasTemporaryEmail?: boolean;
    schoolId?: number;
    companyTypeAdditionalInfo?: string;
    schoolType?: string;
    roleAdditionalInfo?: string;
}

export function login(email: string, password: string) {
    return axiosClient.post("/api/v1/auth/login", { email, password });
}

export function confirmAccount(confirmationToken: string) {
    return axiosClient.get('/api/v1/auth/confirmation', {
        params: { confirmation_token: confirmationToken },
    });
}

export function submitPersonalUserRegistration(formData: formData) {
    // Transformer "other" en "other_personal_user" pour les personal users
    const role = formData.role === "other" ? "other_personal_user" : formData.role;
    
    const userData: any = {
        email: formData.email,              // Non-academic
        password: formData.password,
        password_confirmation: formData.passwordConfirmation,
        first_name: formData.firstName,
        last_name: formData.lastName,
        birthday: formData.birthday,
        role: role,                // parent, grand-parent, voluntary, etc.
        job: formData.job,
        take_trainee: formData.takeTrainee,
        propose_workshop: formData.proposeWorkshop || false,
        show_my_skills: true,
        accept_privacy_policy: formData.acceptPrivacyPolicy || false,
        company_name: formData.companyName,
        has_temporary_email: formData.hasTemporaryEmail
    };

    // Si le rôle est "other" ou "other_personal_user", ajouter role_additional_information avec la valeur du rôle
    if (formData.role === "other" || formData.role === "other_personal_user" || role === "other_personal_user") {
        userData.role_additional_information = formData.roleAdditionalInfo || role;
    }
    
    return axiosClient.post('/api/v1/auth/register', {
        registration_type: "personal_user",  // ← Explicitly set
        user: userData,
        availability: formData.availability,
        skills: {
            skill_ids: formData.selectedSkills,
            sub_skill_ids: formData.selectedSubSkills
        },
        join_school_ids: formData.selectedSchools?.map(id => Number(id)) || [],
        join_company_ids: formData.selectedCompanies?.map(id => Number(id)) || [],
        children_info: (formData.childFirstName && formData.childLastName) ? [{
            first_name: formData.childFirstName,
            last_name: formData.childLastName,
            birthday: formData.childBirthday,
        }] : []
    });
}

export function submitTeacherRegistration(formData: formData) {
    // Transformer "other" en "other_teacher" pour les teachers
    const role = formData.role === "other" ? "other_teacher" : formData.role;
    
    const userData: any = {
        email: formData.email,              // MUST be academic
        password: formData.password,
        password_confirmation: formData.passwordConfirmation,
        first_name: formData.firstName,
        last_name: formData.lastName,
        birthday: formData.birthday,
        role: role,                // school_teacher, college_lycee_professor, etc.
        show_my_skills: true,
        accept_privacy_policy: formData.acceptPrivacyPolicy || false
    };

    // Si le rôle est "other" ou "other_teacher", ajouter role_additional_information avec la valeur du rôle
    if (formData.role === "other" || formData.role === "other_teacher" || role === "other_teacher") {
        userData.role_additional_information = formData.roleAdditionalInfo || role;
    }
    
    // Mapper selectedSchoolsList vers join_school_ids si présent
    const joinSchoolIds = formData.selectedSchoolsList 
        ? formData.selectedSchoolsList.map(school => school.id)
        : (formData.selectedSchools || []);
    
    return axiosClient.post('/api/v1/auth/register', {
        registration_type: "teacher",        // ← Explicitly set
        user: userData,
        availability: formData.availability,
        join_school_ids: joinSchoolIds,
        skills: {
            skill_ids: formData.selectedSkills,
            sub_skill_ids: formData.selectedSubSkills
        },
    });
}

export function submitSchoolRegistration(formData: formData) {
    // Transformer "other" en "other_school_admin" pour les schools
    const role = formData.role === "other" ? "other_school_admin" : formData.role;
    
    const userData: any = {
        email: formData.email,              // MUST be academic
        password: formData.password,
        password_confirmation: formData.passwordConfirmation,
        first_name: formData.firstName,
        last_name: formData.lastName,
        birthday: formData.birthday,
        role: role,                 // school_director, principal, etc.
        accept_privacy_policy: formData.acceptPrivacyPolicy
    };

    // Si le rôle est "other" ou "other_school_admin", ajouter role_additional_information
    // Pour school, on utilise roleAdditionalInfo si fourni (généré automatiquement), sinon le rôle
    if (formData.role === "other" || formData.role === "other_school_admin" || role === "other_school_admin") {
        userData.role_additional_information = formData.roleAdditionalInfo || role;
    }

    return axiosClient.post('/api/v1/auth/register', {
        registration_type: "school",         // ← Explicitly set
        user: userData,
        school: {
            id: formData.schoolId,
            name: formData.schoolName,
            city: formData.schoolCity,
            zip_code: formData.schoolZipCode,
            referent_phone_number: formData.referentPhoneNumber || null,
            uai_code: formData.uaiCode,
            school_type: formData.schoolType,
        }
    });
}

export function submitCompanyRegistration(formData: formData) {
    // Transformer "other" en "other_company_admin" pour les companies
    const role = formData.role === "other" ? "other_company_admin" : formData.role;
    
    const userData: any = {
        email: formData.email,              // Any email (NOT academic)
        password: formData.password,
        password_confirmation: formData.passwordConfirmation,
        first_name: formData.firstName,
        last_name: formData.lastName,
        birthday: formData.birthday,
        role: role,          // company_director, association_president, etc.
        accept_privacy_policy: formData.acceptPrivacyPolicy,
        take_trainee: formData.takeTrainee,
        propose_workshop: formData.proposeWorkshop || false,
        show_my_skills: true,
    };

    // Si le rôle est "other" ou "other_company_admin", ajouter role_additional_information avec la valeur du rôle
    if (formData.role === "other" || formData.role === "other_company_admin" || role === "other_company_admin") {
        userData.role_additional_information = formData.roleAdditionalInfo || role;
    }
    
    return axiosClient.post('/api/v1/auth/register', {
        registration_type: "company",        // ← Explicitly set
        user: userData,
        company: {
            name: formData.companyName,
            show_my_skills: true,
            description: formData.companyDescription,
            company_type_id: formData.companyTypeId,
            company_type_additional_info: formData.companyTypeAdditionalInfo,
            zip_code: formData.companyZipCode,
            city: formData.companyCity,
            referent_phone_number: formData.referentPhoneNumber || null,
            email: formData.companyEmail, // NEW
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

export function forgotPassword(email: string) {
    return axiosClient.post('/api/v1/auth/password/forgot', { email });
}

export function resetPassword(token: string, password: string, passwordConfirmation: string) {
    return axiosClient.post('/api/v1/auth/password/reset', {
        reset_password_token: token,
        password,
        password_confirmation: passwordConfirmation
    });
}