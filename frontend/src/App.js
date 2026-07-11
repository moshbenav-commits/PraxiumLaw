import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";

import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import PracticeAreas from "@/pages/PracticeAreas";
import PracticeAreaDetail from "@/pages/PracticeAreaDetail";
import Solutions from "@/pages/Solutions";
import SolutionDetail from "@/pages/SolutionDetail";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import IntakeForm from "@/pages/IntakeForm";
import NotFound from "@/pages/NotFound";

import Shell from "@/components/Shell";
import Dashboard from "@/pages/Dashboard";
import Matters from "@/pages/Matters";
import MatterDetail from "@/pages/MatterDetail";
import NewMatter from "@/pages/NewMatter";
import Contacts from "@/pages/Contacts";
import NewContact from "@/pages/NewContact";
import ContactDetail from "@/pages/ContactDetail";
import Tasks from "@/pages/Tasks";
import Calendar from "@/pages/Calendar";
import Documents from "@/pages/Documents";
import Chat from "@/pages/Chat";
import MedConnect from "@/pages/MedConnect";
import CourtConnect from "@/pages/CourtConnect";
import NativeSign from "@/pages/NativeSign";
import VoxLine from "@/pages/VoxLine";
import Inbox from "@/pages/Inbox";
import Marketplace from "@/pages/Marketplace";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import AuditLog from "@/pages/AuditLog";
import SettingsTeam from "@/pages/SettingsTeam";
import SettingsIntegrations from "@/pages/SettingsIntegrations";
import SettingsWorkflows from "@/pages/SettingsWorkflows";
import AcceptInvite from "@/pages/AcceptInvite";
import UploadToken from "@/pages/UploadToken";
import SignToken from "@/pages/SignToken";

import { PortalProvider } from "@/contexts/PortalContext";
import PortalShell from "@/components/portal/PortalShell";
import PortalLogin from "@/pages/portal/PortalLogin";
import PortalVerify from "@/pages/portal/PortalVerify";
import PortalDashboard from "@/pages/portal/PortalDashboard";
import PortalMatterDetail from "@/pages/portal/PortalMatterDetail";
import PortalMessages from "@/pages/portal/PortalMessages";

import PraxaLanding from "@/pages/praxa/PraxaLanding";
import PraxaSignup from "@/pages/praxa/PraxaSignup";
import PraxaApp from "@/pages/praxa/PraxaApp";
import VerifyIdentity from "@/pages/VerifyIdentity";
import VerifyIdentityDemo from "@/pages/VerifyIdentityDemo";
import IdentityReview from "@/pages/IdentityReview";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import AccessibilityStatement from "@/pages/AccessibilityStatement";
import TrainingHub from "@/pages/training/TrainingHub";
import TrainingDetail from "@/pages/training/TrainingDetail";
import IntakePacketChecklist from "@/pages/training/IntakePacketChecklist";
import SettingsTemplates from "@/pages/settings/SettingsTemplates";
import SettingsModules from "@/pages/settings/SettingsModules";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Marketing & public */}
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/practice-areas" element={<PracticeAreas />} />
          <Route path="/practice-areas/:slug" element={<PracticeAreaDetail />} />
          <Route path="/solutions" element={<Solutions />} />
          <Route path="/solutions/:slug" element={<SolutionDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/intake/:firmSlug?" element={<IntakeForm />} />
          <Route path="/verify-identity/demo" element={<VerifyIdentityDemo />} />
          <Route path="/verify-identity/:token" element={<VerifyIdentity />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/accessibility" element={<AccessibilityStatement />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/upload/:token" element={<UploadToken />} />
          <Route path="/sign/:token" element={<SignToken />} />

          {/* Client portal (magic-link auth — separate from firm Shell) */}
          <Route
            path="/portal"
            element={
              <PortalProvider>
                <PortalShell requireAuth />
              </PortalProvider>
            }
          >
            <Route index element={<PortalDashboard />} />
            <Route path="matters/:id" element={<PortalMatterDetail />} />
            <Route path="messages" element={<PortalMessages />} />
          </Route>
          <Route
            path="/portal/login"
            element={
              <PortalProvider>
                <PortalLogin />
              </PortalProvider>
            }
          />
          <Route
            path="/portal/verify"
            element={
              <PortalProvider>
                <PortalVerify />
              </PortalProvider>
            }
          />

          {/* Praxa consumer app */}
          <Route path="/praxa" element={<PraxaLanding />} />
          <Route path="/praxa/signup" element={<PraxaSignup />} />
          <Route path="/praxa/app/*" element={<PraxaApp />} />

          {/* Firm OS (authenticated) */}
          <Route element={<Shell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/matters" element={<Matters />} />
            <Route path="/matters/new" element={<NewMatter />} />
            <Route path="/matters/:id" element={<MatterDetail />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/contacts/new" element={<NewContact />} />
            <Route path="/contacts/:id" element={<ContactDetail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/medconnect" element={<MedConnect />} />
            <Route path="/courtconnect" element={<CourtConnect />} />
            <Route path="/esign" element={<NativeSign />} />
            <Route path="/voxline" element={<VoxLine />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/training" element={<TrainingHub />} />
            <Route path="/training/intake-checklist" element={<IntakePacketChecklist />} />
            <Route path="/training/:type/:slug" element={<TrainingDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/templates" element={<SettingsTemplates />} />
            <Route path="/settings/integrations" element={<SettingsIntegrations />} />
            <Route path="/settings/team" element={<SettingsTeam />} />
            <Route path="/settings/workflows" element={<SettingsWorkflows />} />
            <Route path="/settings/modules" element={<SettingsModules />} />
            <Route path="/settings/audit" element={<AuditLog />} />
            <Route path="/settings/identity-review" element={<IdentityReview />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
