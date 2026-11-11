import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button, Card, Chip, Empty, Loading, Modal, QueryError, Tabs } from './index';

const meta = {
  title: 'Т-Лига/Состояния интерфейса',
  component: Card,
  args: { children: null },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PrimaryAction: Story = {
  render: () => (
    <Card>
      <h2>Проверка заявки</h2>
      <p>Покупка одного лота Сбербанка: 2 792,55 ₽ с комиссией.</p>
      <Button>Проверить заявку</Button>
    </Card>
  ),
};
export const DisabledAction: Story = {
  render: () => (
    <Card>
      <h2>Недостаточно средств</h2>
      <p>Доступно 1 000 ₽. Для заявки нужно 2 792,55 ₽.</p>
      <Button disabled>Подтвердить покупку</Button>
    </Card>
  ),
};
export const PendingApproval: Story = {
  render: () => (
    <Card>
      <Chip yellow>Ждёт согласования</Chip>
      <h2>Дополнительный взнос</h2>
      <p>10 000 ₽. До согласования стоимость доли не меняется.</p>
      <Button variant="secondary">Посмотреть расчёт</Button>
    </Card>
  ),
};
export const EmptyJournal: Story = {
  render: () => (
    <Card>
      <Empty
        title="Решений пока нет"
        text="Действия агента появятся здесь после анализа или изменения правил."
      />
    </Card>
  ),
};
export const NetworkFailure: Story = {
  render: () => (
    <Card>
      <QueryError
        error={new Error('Не удалось получить портфель. Сохранённые правила не изменены.')}
        retry={() => undefined}
      />
    </Card>
  ),
};
export const LoadingPortfolio: Story = {
  render: () => (
    <Card>
      <Loading />
    </Card>
  ),
};
function InteractiveTabs() {
  const [value, setValue] = useState('overview');
  return (
    <Card>
      <Tabs
        items={[
          { value: 'overview', label: 'Обзор' },
          { value: 'members', label: 'Участники' },
          { value: 'chat', label: 'Чат' },
        ]}
        value={value}
        onChange={setValue}
      />
      <p>
        {value === 'overview'
          ? 'Капитал сквада: 231 000 ₽'
          : value === 'members'
            ? '3 из 4 участников'
            : 'Обсуждение общей стратегии'}
      </p>
    </Card>
  );
}
export const SquadTabs: Story = { render: () => <InteractiveTabs /> };
function ConfirmDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Открыть подтверждение</Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Подтвердить демосделку"
        description="Изменится только локальный виртуальный портфель."
      >
        <p>Один лот. Комиссия 8,35 ₽.</p>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Отмена
        </Button>
        <Button onClick={() => setOpen(false)}>Подтвердить</Button>
      </Modal>
    </>
  );
}
export const Confirmation: Story = { render: () => <ConfirmDialog /> };
