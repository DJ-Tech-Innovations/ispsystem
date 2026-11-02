<?php

namespace App\Models\Concerns;

use App\Support\Audit;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

/** Records created / updated / deleted on the audit trail, with an old → new diff of the fields that changed. */
trait LogsChanges
{
    protected static function bootLogsChanges(): void
    {
        static::created(fn ($model) => Audit::log($model->auditModule(), 'created', $model->auditLabel().' created', $model));
        static::updated(function ($model) {
            $ignored = ['updated_at', 'created_at', 'remember_token', 'password', ...$model->auditIgnored()];
            $changes = Arr::except($model->getChanges(), $ignored);
            if ($changes === []) {
                return;
            }
            $diff = [];
            foreach (array_keys($changes) as $field) {
                $diff[$field] = ['old' => $model->getOriginal($field), 'new' => $model->getAttribute($field)];
            }
            Audit::log($model->auditModule(), 'updated', $model->auditLabel().' updated', $model, ['changes' => $diff]);
        });
        static::deleted(fn ($model) => Audit::log($model->auditModule(), 'deleted', $model->auditLabel().' deleted', $model));
    }

    public function auditModule(): string
    {
        return Str::snake(class_basename($this));
    }

    public function auditLabel(): string
    {
        return Str::headline(class_basename($this)).' '.($this->reference ?? $this->number ?? $this->name ?? $this->getKey());
    }

    /** @return list<string> */
    protected function auditIgnored(): array
    {
        return [];
    }
}
