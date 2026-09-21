'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Scissors,
  Calendar,
  Clock,
  User,
  Phone,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

// --- CONFIGURAÇÕES ---
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type Agendamento = {
  id: string;
  cliente_nome: string;
  cliente_telefone: string;
  servico_nome: string;
  servico_preco: number;
  horario_inicio: string;
  horario_fim: string;
  data_agendamento: string;
};

export default function AgendaAdmin() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [dataSelecionada, setDataSelecionada] = useState(todayStr);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Formatar data YYYY-MM-DD para DD/MM/YYYY
  const formatarData = (d: string) => d.split('-').reverse().join('/');

  // Buscar agendamentos do dia selecionado
  const carregarAgendamentos = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('data_agendamento', dataSelecionada)
      .order('horario_inicio', { ascending: true });

    if (!error && data) {
      setAgendamentos(data);
    }
    setCarregando(false);
  }, [dataSelecionada]);

  useEffect(() => {
    carregarAgendamentos();
  }, [carregarAgendamentos]);

  // Cancelar/deletar agendamento
  const cancelarAgendamento = async (id: string) => {
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id);

    if (!error) {
      setAgendamentos((prev) => prev.filter((a) => a.id !== id));
    }
    setConfirmDelete(null);
  };

  // Abrir WhatsApp com mensagem de lembrete / confirmação
  const abrirWhatsApp = (a: Agendamento) => {
    const numLimpo = a.cliente_telefone.replace(/\D/g, '');
    const [ano, mes, dia] = a.data_agendamento.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;
    const hora = a.horario_inicio.slice(0, 5);

    const texto = `Olá *${a.cliente_nome}*! Tudo bem? Aqui é o barbeiro Marcelo da *Black Star Barber* 💈\n\nPassando para confirmar seu horário:\n📅 *Data:* ${dataFormatada}\n⏰ *Horário:* ${hora}\n✂️ *Serviço:* ${a.servico_nome} (R$ ${a.servico_preco},00)\n\nPodemos confirmar sua presença?`;

    const mensagem = encodeURIComponent(texto);
    window.open(`https://wa.me/55${numLimpo}?text=${mensagem}`, '_blank');
  };

  // --- Lógica do Calendário ---
  const primeiroDia = new Date(calYear, calMonth, 1).getDay();
  const diasNoMes = new Date(calYear, calMonth + 1, 0).getDate();

  const irMesAnterior = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const irProximoMes = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  const selecionarDia = (dia: number) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    setDataSelecionada(`${calYear}-${mm}-${dd}`);
  };

  const isDiaSelecionado = (dia: number) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    return dataSelecionada === `${calYear}-${mm}-${dd}`;
  };

  const isHoje = (dia: number) => {
    return (
      calYear === today.getFullYear() &&
      calMonth === today.getMonth() &&
      dia === today.getDate()
    );
  };

  // Célula vazia para alinhar o calendário
  const celulasVazias = Array.from({ length: primeiroDia });
  const diasDoMes = Array.from({ length: diasNoMes }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-gray-100 flex flex-col font-sans">

      {/* HEADER */}
      <header className="border-b border-[#26262e] bg-[#121215]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#f3e5ab] flex items-center justify-center shadow-lg shadow-[#d4af37]/20">
              <Scissors className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider text-white uppercase flex items-center gap-2">
                BLACK STAR <Sparkles className="w-4 h-4 text-[#d4af37]" />
              </h1>
              <p className="text-xs text-[#d4af37] font-semibold">Painel do Barbeiro</p>
            </div>
          </div>

          <button
            onClick={carregarAgendamentos}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1c1c22] border border-[#2d2d38] text-gray-300 hover:text-[#d4af37] hover:border-[#d4af37] transition text-xs font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 space-y-6">

        <div className="grid md:grid-cols-[340px_1fr] gap-6 items-start">

          {/* CALENDÁRIO */}
          <div className="bg-[#141418] border border-[#26262e] rounded-2xl p-5 shadow-xl">
            {/* Navegação mês */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={irMesAnterior}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#26262e] text-gray-400 hover:text-white transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-bold text-white text-sm">
                {MESES[calMonth]} {calYear}
              </span>
              <button
                onClick={irProximoMes}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#26262e] text-gray-400 hover:text-white transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Cabeçalho dias da semana */}
            <div className="grid grid-cols-7 mb-2">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-gray-500 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Dias */}
            <div className="grid grid-cols-7 gap-1">
              {celulasVazias.map((_, i) => <div key={`e-${i}`} />)}
              {diasDoMes.map((dia) => {
                const selecionado = isDiaSelecionado(dia);
                const hoje = isHoje(dia);
                return (
                  <button
                    key={dia}
                    onClick={() => selecionarDia(dia)}
                    className={`
                      aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition
                      ${selecionado
                        ? 'bg-[#d4af37] text-black font-bold shadow-md shadow-[#d4af37]/30'
                        : hoje
                        ? 'bg-[#1e1b13] border border-[#d4af37]/40 text-[#d4af37]'
                        : 'hover:bg-[#26262e] text-gray-300'
                      }
                    `}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PAINEL DE AGENDAMENTOS */}
          <div className="space-y-4">
            {/* Título do dia */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#d4af37]" />
                  {formatarData(dataSelecionada)}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {agendamentos.length === 0
                    ? 'Nenhum agendamento neste dia'
                    : `${agendamentos.length} agendamento${agendamentos.length > 1 ? 's' : ''}`}
                </p>
              </div>

              {/* Resumo de faturamento */}
              {agendamentos.length > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total do dia</p>
                  <p className="text-xl font-extrabold text-[#d4af37]">
                    R$ {agendamentos.reduce((acc, a) => acc + a.servico_preco, 0)},00
                  </p>
                </div>
              )}
            </div>

            {/* Lista de agendamentos */}
            {carregando ? (
              <div className="py-12 text-center text-gray-500 text-sm flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#d4af37]" />
                Carregando agendamentos...
              </div>
            ) : agendamentos.length === 0 ? (
              <div className="py-12 text-center bg-[#141418] border border-[#26262e] rounded-2xl">
                <Calendar className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nenhum horário marcado neste dia.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agendamentos.map((a) => (
                  <div
                    key={a.id}
                    className="bg-[#141418] border border-[#26262e] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-[#d4af37]/30 transition"
                  >
                    {/* Horário */}
                    <div className="flex items-center gap-3 sm:w-28 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-[#1e1b13] border border-[#d4af37]/30 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-[#d4af37]" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-base">{a.horario_inicio}</p>
                        <p className="text-xs text-gray-500">até {a.horario_fim}</p>
                      </div>
                    </div>

                    {/* Divisor vertical */}
                    <div className="hidden sm:block w-px h-12 bg-[#26262e]" />

                    {/* Dados do cliente */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span className="font-semibold text-white text-sm">{a.cliente_nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span className="text-gray-400 text-sm">{a.cliente_telefone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span className="text-gray-400 text-sm">{a.servico_nome}</span>
                        <span className="ml-auto font-bold text-[#d4af37] text-sm">R$ {a.servico_preco},00</span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      <button
                        onClick={() => abrirWhatsApp(a)}
                        title="Enviar lembrete pelo WhatsApp"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-900/40 border border-emerald-700/30 text-emerald-400 hover:bg-emerald-800/50 hover:border-emerald-600 transition text-xs font-medium"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Lembrar cliente
                      </button>
                      <button
                        onClick={() => setConfirmDelete(a.id)}
                        title="Cancelar agendamento"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-900/30 border border-red-800/30 text-red-400 hover:bg-red-900/50 hover:border-red-700 transition text-xs font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-white text-lg">Cancelar agendamento?</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Essa ação é irreversível. O agendamento será removido do sistema.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#26262e] text-gray-400 hover:text-white hover:border-gray-600 transition text-sm font-medium"
              >
                Voltar
              </button>
              <button
                onClick={() => cancelarAgendamento(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold transition text-sm"
              >
                Sim, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
