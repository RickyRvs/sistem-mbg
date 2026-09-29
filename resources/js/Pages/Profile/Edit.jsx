import MbgLayout from '@/Layouts/MbgLayout';
import PageHeader from '@/Components/PageHeader';
import { card } from '@/lib/ui';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    return (
        <MbgLayout title="Profil">
            <PageHeader title="Profil" subtitle="Kelola data akun dan kata sandi" />

            <div className="mx-auto max-w-3xl space-y-6">
                <div className={`${card} sm:p-8`}>
                    <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} className="max-w-xl" />
                </div>
                <div className={`${card} sm:p-8`}>
                    <UpdatePasswordForm className="max-w-xl" />
                </div>
                <div className={`${card} border-red-200 sm:p-8`}>
                    <DeleteUserForm className="max-w-xl" />
                </div>
            </div>
        </MbgLayout>
    );
}