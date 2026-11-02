<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Inter,Arial,sans-serif;color:#0f172a">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#172554;color:#fff;padding:20px 28px;font-size:18px;font-weight:600">{{ $business['name'] }}</td></tr>
{{-- Escaped first, so a placeholder value can never inject markup. --}}
<tr><td style="padding:28px;font-size:15px;line-height:1.6">{!! nl2br(e($body)) !!}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">{{ $business['name'] }} · {{ $business['email'] }} @if($business['phone']) · {{ $business['phone'] }} @endif</td></tr>
</table></td></tr></table>
</body></html>
