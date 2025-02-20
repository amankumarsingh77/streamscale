import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
    User,
    Settings2,
    Code,
    Shield,
    Bell,
    Zap,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PlayerSettings {
    autoplay: boolean;
    loop: boolean;
    showControls: boolean;
    theme: string;
    width: string;
    height: string;
}

interface ProfileSettings {
    name: string;
    email: string;
    company: string;
    bio: string;
}

interface NotificationSettings {
    emailNotifications: boolean;
    processingUpdates: boolean;
    securityAlerts: boolean;
    marketingEmails: boolean;
}

interface SecuritySettings {
    twoFactorAuth: boolean;
    sessionTimeout: number;
    apiAccess: boolean;
}

const Settings = () => {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [playerSettings, setPlayerSettings] = useState<PlayerSettings>({
        autoplay: false,
        loop: false,
        showControls: true,
        theme: "dark",
        width: "100%",
        height: "auto",
    });

    const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
        name: "",
        email: "",
        company: "",
        bio: "",
    });

    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        emailNotifications: true,
        processingUpdates: true,
        securityAlerts: true,
        marketingEmails: false,
    });

    const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
        twoFactorAuth: false,
        sessionTimeout: 30,
        apiAccess: true,
    });

    const [embedCode, setEmbedCode] = useState<string>("");

    useEffect(() => {
        if (user) {
            setProfileSettings(prev => ({
                ...prev,
                name: user.name || "",
                email: user.email || "",
            }));
        }
    }, [user]);

    const generateEmbedCode = () => {
        const code = `<iframe
  src="https://streamscale.app/embed/player?autoplay=${playerSettings.autoplay}&loop=${playerSettings.loop}&controls=${playerSettings.showControls}&theme=${playerSettings.theme}"
  width="${playerSettings.width}"
  height="${playerSettings.height}"
  frameborder="0"
  allowfullscreen
></iframe>`;
        setEmbedCode(code);
    };

    const handlePlayerSettingChange = (key: keyof PlayerSettings, value: any) => {
        setPlayerSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleProfileSettingChange = (key: keyof ProfileSettings, value: string) => {
        setProfileSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleNotificationSettingChange = (key: keyof NotificationSettings, value: boolean) => {
        setNotificationSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSecuritySettingChange = (key: keyof SecuritySettings, value: any) => {
        setSecuritySettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess(false);
        setError(null);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight mb-2">
                        <span className="text-white">Account</span>
                        <span className="text-violet-400 ml-2">Settings</span>
                    </h1>
                    <p className="text-slate-400 text-sm">Manage your account preferences and settings</p>
                </div>
            </div>

            {success && (
                <Alert className="mb-6 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>Settings saved successfully!</AlertDescription>
                </Alert>
            )}

            {error && (
                <Alert className="mb-6 bg-red-500/10 text-red-400 border-red-500/20">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="profile" className="space-y-8">
                <TabsList className="bg-black/40 backdrop-blur-sm border border-slate-800">
                    <TabsTrigger value="profile" className="data-[state=active]:bg-violet-600">
                        <User className="w-4 h-4 mr-2" /> Profile
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="data-[state=active]:bg-violet-600">
                        <Bell className="w-4 h-4 mr-2" /> Notifications
                    </TabsTrigger>
                    <TabsTrigger value="security" className="data-[state=active]:bg-violet-600">
                        <Shield className="w-4 h-4 mr-2" /> Security
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <Card className="p-6 bg-black/40 backdrop-blur-xl border-slate-800">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 backdrop-blur-sm flex items-center justify-center border border-violet-500/20">
                                    <User className="w-8 h-8 text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-white mb-1">Profile Picture</h3>
                                    <p className="text-sm text-slate-400 mb-3">Upload a new profile picture</p>
                                    <Button variant="outline" className="border-slate-700">
                                        Change Photo
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-slate-300">Full Name</Label>
                                        <Input
                                            value={profileSettings.name}
                                            onChange={(e) => handleProfileSettingChange('name', e.target.value)}
                                            className="bg-black/20 border-slate-800 text-white"
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-slate-300">Email</Label>
                                        <Input
                                            type="email"
                                            value={profileSettings.email}
                                            onChange={(e) => handleProfileSettingChange('email', e.target.value)}
                                            className="bg-black/20 border-slate-800 text-white"
                                            placeholder="Enter your email"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-300">Company</Label>
                                    <Input
                                        value={profileSettings.company}
                                        onChange={(e) => handleProfileSettingChange('company', e.target.value)}
                                        className="bg-black/20 border-slate-800 text-white"
                                        placeholder="Enter your company name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-300">Bio</Label>
                                    <Textarea
                                        value={profileSettings.bio}
                                        onChange={(e) => handleProfileSettingChange('bio', e.target.value)}
                                        className="bg-black/20 border-slate-800 text-white h-24"
                                        placeholder="Tell us about yourself"
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications">
                    <Card className="p-6 bg-black/40 backdrop-blur-xl border-slate-800">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between py-3 border-b border-slate-800">
                                <div>
                                    <Label className="text-sm font-medium text-white">Email Notifications</Label>
                                    <p className="text-sm text-slate-400">Receive email notifications about your account</p>
                                </div>
                                <Switch
                                    checked={notificationSettings.emailNotifications}
                                    onCheckedChange={(checked) => handleNotificationSettingChange('emailNotifications', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-slate-800">
                                <div>
                                    <Label className="text-sm font-medium text-white">Processing Updates</Label>
                                    <p className="text-sm text-slate-400">Get notified when your videos are processed</p>
                                </div>
                                <Switch
                                    checked={notificationSettings.processingUpdates}
                                    onCheckedChange={(checked) => handleNotificationSettingChange('processingUpdates', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-slate-800">
                                <div>
                                    <Label className="text-sm font-medium text-white">Security Alerts</Label>
                                    <p className="text-sm text-slate-400">Receive alerts about your account security</p>
                                </div>
                                <Switch
                                    checked={notificationSettings.securityAlerts}
                                    onCheckedChange={(checked) => handleNotificationSettingChange('securityAlerts', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <Label className="text-sm font-medium text-white">Marketing Emails</Label>
                                    <p className="text-sm text-slate-400">Receive updates about new features and promotions</p>
                                </div>
                                <Switch
                                    checked={notificationSettings.marketingEmails}
                                    onCheckedChange={(checked) => handleNotificationSettingChange('marketingEmails', checked)}
                                />
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card className="p-6 bg-black/40 backdrop-blur-xl border-slate-800">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between py-3 border-b border-slate-800">
                                <div>
                                    <Label className="text-sm font-medium text-white">Two-Factor Authentication</Label>
                                    <p className="text-sm text-slate-400">Add an extra layer of security to your account</p>
                                </div>
                                <Switch
                                    checked={securitySettings.twoFactorAuth}
                                    onCheckedChange={(checked) => handleSecuritySettingChange('twoFactorAuth', checked)}
                                />
                            </div>

                            <div className="py-3 border-b border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <Label className="text-sm font-medium text-white">Session Timeout</Label>
                                        <p className="text-sm text-slate-400">Automatically log out after inactivity</p>
                                    </div>
                                    <Input
                                        type="number"
                                        value={securitySettings.sessionTimeout}
                                        onChange={(e) => handleSecuritySettingChange('sessionTimeout', parseInt(e.target.value))}
                                        className="w-24 bg-black/20 border-slate-800 text-white"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">Minutes of inactivity before automatic logout</p>
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <Label className="text-sm font-medium text-white">API Access</Label>
                                    <p className="text-sm text-slate-400">Enable API access for your account</p>
                                </div>
                                <Switch
                                    checked={securitySettings.apiAccess}
                                    onCheckedChange={(checked) => handleSecuritySettingChange('apiAccess', checked)}
                                />
                            </div>

                            <div className="pt-4">
                                <Button
                                    variant="destructive"
                                    className="w-full bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                                >
                                    Delete Account
                                </Button>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="mt-8 flex justify-end">
                <Button
                    className="bg-violet-600 hover:bg-violet-700 font-medium tracking-wide min-w-[120px]"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <div className="flex items-center">
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                            Saving...
                        </div>
                    ) : (
                        <>
                            <Zap className="w-4 h-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default Settings;