import unittest
import numpy as np
from audit_movie import remove_background
from media_sync import waveform_lag,warp_audio,marker_audio,SR,remove_clock_tone

class SynchronizationRegression(unittest.TestCase):
 def test_finished_waveform_detects_positive_and_negative_slips(self):
  rng=np.random.default_rng(311);rate=12000;reference=rng.normal(0,.08,rate)
  for slip in [0,.3,-.3]:
   with self.subTest(slip=slip):
    x=rng.normal(0,.003,rate*2);i=round((.5+slip)*rate);x[i:i+rate]+=reference
    lag,r=waveform_lag(reference,x,rate,0,.5)
    self.assertAlmostEqual(lag,slip,places=4);self.assertGreater(r,.99)
    self.assertEqual(abs(lag)<=.08,slip==0,'A decodable but 300ms-desynced output must fail')
 def test_noisy_finished_mix_does_not_hide_a_delayed_game_sound(self):
  rng=np.random.default_rng(91);rate=12000;ref=rng.normal(0,.03,rate);bg=rng.normal(0,.4,rate*2)
  for slip in [0,.3,-.3]:
   y=bg*1.7;i=round((.5+slip)*rate);y[i:i+rate]+=ref*.6
   residual,gain=remove_background(y,bg);lag,corr=waveform_lag(ref,residual,rate,0,.5)
   self.assertAlmostEqual(lag,slip,places=4);self.assertGreater(corr,.99)
 def test_clock_drift_corrected_at_beginning_middle_and_end(self):
  v=np.array([.5,4.5,8.5,12.5,16.5,20.5]);a=v+np.array([.08,.10,.12,.14,.16,.18]);raw=np.zeros((22*SR,2),np.float32)
  pulse=np.sin(2*np.pi*16000*np.arange(round(.08*SR))/SR)*.12*np.hanning(round(.08*SR))
  for t in a:
   i=round(t*SR);raw[i:i+len(pulse)]+=pulse[:,None]
  corrected=warp_audio(raw,v,a,0,22)
  on=marker_audio(corrected,v,frequency=None)
  self.assertLess(max(abs(on-v)),.025)
 def test_reversed_clock_anchors_rejected(self):
  with self.assertRaises(ValueError):warp_audio(np.zeros((SR,2)),np.arange(6),np.array([0,1,2,1,4,5]),0,1)
 def test_calibration_tone_does_not_leak_to_game_audio(self):
  t=np.arange(SR)/SR;raw=np.column_stack([np.sin(2*np.pi*16000*t)*.1]*2);clean=remove_clock_tone(raw)
  self.assertLess(np.sqrt(np.mean(clean[SR//10:-SR//10]**2)),1e-5)
 def test_warp_keeps_exact_sample_duration(self):
  x=warp_audio(np.zeros((SR*2,2)),np.arange(6),np.arange(6)+.03,.2,1/30*7)
  self.assertEqual(len(x),7*1600)

if __name__=='__main__':unittest.main()
