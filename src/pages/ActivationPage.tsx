import { useState } from 'react';
import { useLicense } from '@/hooks/useLicense';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ActivationPage() {
  const { isActivated, activate, deactivate } = useLicense();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!key.trim()) { toast.error('Please enter a license key'); return; }
    setLoading(true);
    const success = await activate(key);
    setLoading(false);
    if (success) {
      toast.success('License activated! EPI and ANC modules unlocked.');
      setKey('');
    } else {
      toast.error('Invalid license key. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Activation</h2>
        <p className="text-muted-foreground">Unlock premium modules with your license key</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="program-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-primary" />
              License Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isActivated ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium text-foreground">Activated</p>
                    <p className="text-xs text-muted-foreground">EPI & ANC modules unlocked</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={deactivate} className="text-destructive">
                  Deactivate License
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Not Activated</p>
                    <p className="text-xs text-muted-foreground">TBCare & HIVCare available free</p>
                  </div>
                </div>
                <div>
                  <Label>License Key</Label>
                  <Input
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="CARESYNC-XXX-XXXX"
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleActivate} disabled={loading} className="w-full">
                  {loading ? 'Verifying...' : 'Activate'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Card className="program-card">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-2">Module Access</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">TBCare</span>
              <span className="status-badge-ok">Free</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">HIVCare</span>
              <span className="status-badge-ok">Free</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">EPI Defaulter Tracing</span>
              {isActivated ? <span className="status-badge-ok">Unlocked</span> : <span className="status-badge-overdue">Locked</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ANC Defaulter Tracing</span>
              {isActivated ? <span className="status-badge-ok">Unlocked</span> : <span className="status-badge-overdue">Locked</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
