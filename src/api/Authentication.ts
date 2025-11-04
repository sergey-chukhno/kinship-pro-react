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
    availability?: string;
    selectedSkills?: string[];
    selectedSubSkills?: string[];
    selectedSchools?: string[];
    selectedCompanies?: string[];
    schoolName?: string;
    schoolAddress?: string;
    schoolCity?: string;
    schoolZipCode?: string;
    companyName?: string;
    companyDescription?: string;
    companyTypeId?: string;
    companyZipCode?: string;
    companyCity?: string;
    siretNumber?: string;
    companyEmail?: string;
    parentCompanyId?: string;
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
        propose_workshop: formData.proposeWorkshop,
        show_my_skills: formData.showMySkills
        },
        availability: formData.availability,
        skills: {
        skill_ids: formData.selectedSkills,
        sub_skill_ids: formData.selectedSubSkills
        },
        join_school_ids: formData.selectedSchools,
        join_company_ids: formData.selectedCompanies
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
        show_my_skills: formData.showMySkills
        },
        availability: formData.availability,
        join_school_ids: formData.selectedSchools
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
        role: formData.role                 // school_director, principal, etc.
        },
        school: {
        name: formData.schoolName,
        address: formData.schoolAddress,
        city: formData.schoolCity,
        zip_code: formData.schoolZipCode
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
        role: formData.role                 // company_director, association_president, etc.
        },
        company: {
        name: formData.companyName,
        description: formData.companyDescription,
        company_type_id: formData.companyTypeId,
        zip_code: formData.companyZipCode,
        city: formData.companyCity,
        siret_number: formData.siretNumber,
        email: formData.companyEmail,
        branch_request_to_company_id: formData.parentCompanyId  // Optional
        }
    });
}