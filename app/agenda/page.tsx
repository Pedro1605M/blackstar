'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Scissors,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MessageSquare,
  Trash2,
  AlertTriangle,
  Lock,
  LogOut,
  ArrowLeft,
  DollarSign,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react';

// --- CONFIGURAÇÕES ---
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// PIN de acesso do barbeiro (configurável no .env.local via NEXT_PUBLIC_ADMIN_PIN)
const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || '1234';

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
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Autenticação
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [erroPin, setErroPin] = useState(false);

  // Navegação de Data
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [dataSelecionada, setDataSelecionada] = useState(todayStr);

  // Dados
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [diasComAgendamento, setDiasComAgendamento] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Anos disponíveis para seleção rápida no dropdown
  const anosDisponiveis = [
    today.getFullYear() - 1,
    today.getFullYear(),
    today.getFullYear() + 1,
    today.getFullYear() + 2,
  ];

  // Checar login salvo
  useEffect(() => {
    const salvo = typeof window !== 'undefined' ? localStorage.getItem('blackstar_admin_auth') : null;
    setAutenticado(salvo === 'true');
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PIN) {
      localStorage.setItem('blackstar_admin_auth', 'true');
      setAutenticado(true);
      setErroPin(false);
      setPinInput('');
    } else {
      setErroPin(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('blackstar_admin_auth');
    setAutenticado(false);
    setPinInput('');
  };

  // Buscar agendamentos do dia selecionado
  const carregarAgendamentosDoDia = useCallback(async () => {
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

  // Buscar dias com agendamento no mês corrente para marcar com ponto no calendário
  const carregarDiasOcupadosNoMes = useCallback(async () => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const inicioMes = `${calYear}-${mm}-01`;
    const diasNoMesAtual = new Date(calYear, calMonth + 1, 0).getDate();
    const fimMes = `${calYear}-${mm}-${String(diasNoMesAtual).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('agendamentos')
      .select('data_agendamento')
      .gte('data_agendamento', inicioMes)
      .lte('data_agendamento', fimMes);

    if (!error && data) {
      const setDias = new Set<string>();
      data.forEach((item: { data_agendamento: string }) => {
        setDias.add(item.data_agendamento);
      });
      setDiasComAgendamento(setDias);
    }
  }, [calYear, calMonth]);

  useEffect(() => {
    if (autenticado) {
      carregarAgendamentosDoDia();
    }
  }, [carregarAgendamentosDoDia, autenticado]);

  useEffect(() => {
    if (autenticado) {
      carregarDiasOcupadosNoMes();
    }
  }, [carregarDiasOcupadosNoMes, autenticado]);

  // Excluir agendamento
  const cancelarAgendamento = async (id: string) => {
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id);

    if (!error) {
      setAgendamentos((prev) => prev.filter((a) => a.id !== id));
      carregarDiasOcupadosNoMes();
    }
    setConfirmDelete(null);
  };

  // Enviar lembrete via WhatsApp
  const abrirWhatsApp = (a: Agendamento) => {
    const numLimpo = a.cliente_telefone.replace(/\D/g, '');
    const [ano, mes, dia] = a.data_agendamento.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;
    const hora = a.horario_inicio.slice(0, 5);

    const texto = `Olá *${a.cliente_nome}*! Tudo bem? Aqui é o barbeiro Marcelo da *Black Star Barber* 💈\n\nPassando para confirmar seu horário:\n📅 *Data:* ${dataFormatada}\n⏰ *Horário:* ${hora}\n✂️ *Serviço:* ${a.servico_nome} (R$ ${a.servico_preco},00)\n\nPodemos confirmar sua presença?`;

    const mensagem = encodeURIComponent(texto);
    window.open(`https://wa.me/55${numLimpo}?text=${mensagem}`, '_blank');
  };

  // Formatar data por extenso (ex: Segunda-feira, 21 de Setembro de 2026)
  const formatarDataExtenso = (dataIso: string) => {
    if (!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-').map(Number);
    const dateObj = new Date(ano, mes - 1, dia);
    return dateObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Funções de navegação de data
  const irMesAnterior = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const irProximoMes = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const selecionarDia = (dia: number) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    setDataSelecionada(`${calYear}-${mm}-${dd}`);
  };

  const irParaHoje = () => {
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth());
    setDataSelecionada(todayStr);
  };

  const irParaAmanha = () => {
    const amanha = new Date();
    amanha.setDate(today.getDate() + 1);
    const amanhaStr = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`;
    setCalYear(amanha.getFullYear());
    setCalMonth(amanha.getMonth());
    setDataSelecionada(amanhaStr);
  };

  // Lógica do grid do calendário
  const primeiroDiaSemana = new Date(calYear, calMonth, 1).getDay();
  const totalDiasNoMes = new Date(calYear, calMonth + 1, 0).getDate();
  const celulasVazias = Array.from({ length: primeiroDiaSemana });
  const diasDoMes = Array.from({ length: totalDiasNoMes }, (_, i) => i + 1);

  // Cálculos de métricas do dia
  const faturamentoTotalDia = agendamentos.reduce((acc, a) => acc + Number(a.servico_preco || 0), 0);
  const primeiroHorario = agendamentos.length > 0 ? agendamentos[0].horario_inicio.slice(0, 5) : null;

  // Carregamento inicial de verificação de autenticação
  if (autenticado === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  // TELA DE AUTENTICAÇÃO / PIN SÓBRIA E PROFISSIONAL
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center mx-auto text-zinc-300">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Black Star Barber</h1>
            <p className="text-xs text-zinc-400">Painel Administrativo do Barbeiro</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                PIN de Segurança
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (erroPin) setErroPin(false);
                }}
                placeholder="••••"
                autoFocus
                className={`w-full text-center tracking-[0.4em] font-mono text-xl py-2.5 px-4 rounded-xl bg-zinc-950 border ${
                  erroPin
                    ? 'border-red-500 text-red-400 focus:ring-red-500'
                    : 'border-zinc-800 text-zinc-100 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                } outline-none transition`}
              />
              {erroPin && (
                <p className="text-red-400 text-xs mt-2 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> PIN incorreto. Tente novamente.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-sm transition active:scale-[0.99] cursor-pointer"
            >
              Acessar Painel
            </button>
          </form>

          <div className="pt-4 border-t border-zinc-800/80 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // PAINEL ADMINISTRATIVO PROFISSIONAL
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-zinc-100">

      {/* HEADER EXECUTIVO */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/70 flex items-center justify-center text-zinc-200">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-zinc-100">Black Star Barber</h1>
              <p className="text-[11px] text-zinc-400">Gestão de Agenda e Clientes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                carregarAgendamentosDoDia();
                carregarDiasOcupadosNoMes();
              }}
              title="Recarregar dados"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition text-xs font-medium cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin text-zinc-400' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              onClick={handleLogout}
              title="Bloquear painel"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-900/50 text-zinc-400 hover:text-red-400 transition text-xs font-medium cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* MÉTRICAS / RESUMO DO DIA SELECIONADO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400">Agendamentos no Dia</p>
              <p className="text-2xl font-semibold text-zinc-100">
                {agendamentos.length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-800/60 border border-zinc-750 flex items-center justify-center text-zinc-300">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400">Faturamento Previsto</p>
              <p className="text-2xl font-semibold text-zinc-100">
                R$ {faturamentoTotalDia},00
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-800/60 border border-zinc-750 flex items-center justify-center text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400">Primeiro Horário</p>
              <p className="text-2xl font-semibold text-zinc-100">
                {primeiroHorario ? `${primeiroHorario}h` : '—'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-800/60 border border-zinc-750 flex items-center justify-center text-zinc-300">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ÁREA PRINCIPAL: CALENDÁRIO + HORÁRIOS */}
        <div className="grid grid-cols-1 md:grid-cols-[330px_1fr] gap-6 items-start">

          {/* CALENDÁRIO COM SELETOR FLUIDO DE MÊS E ANO */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 space-y-4">

            {/* SELETOR FLUIDO: DROPDOWNS DIRETOS + ATALHOS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-1">
                {/* Seletores Diretos de Mês e Ano */}
                <div className="flex items-center gap-1.5 flex-1">
                  <select
                    value={calMonth}
                    onChange={(e) => setCalMonth(Number(e.target.value))}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-medium py-1.5 px-2.5 rounded-lg outline-none focus:border-zinc-600 cursor-pointer"
                  >
                    {MESES.map((mes, idx) => (
                      <option key={mes} value={idx}>
                        {mes}
                      </option>
                    ))}
                  </select>

                  <select
                    value={calYear}
                    onChange={(e) => setCalYear(Number(e.target.value))}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-medium py-1.5 px-2.5 rounded-lg outline-none focus:border-zinc-600 cursor-pointer"
                  >
                    {anosDisponiveis.map((ano) => (
                      <option key={ano} value={ano}>
                        {ano}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Setas de avançar/voltar um mês */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={irMesAnterior}
                    title="Mês anterior"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={irProximoMes}
                    title="Próximo mês"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Botões de Atalho Rápido */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={irParaHoje}
                  className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    dataSelecionada === todayStr
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                      : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={irParaAmanha}
                  className="flex-1 py-1 px-2.5 rounded-lg text-xs font-medium border bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition cursor-pointer"
                >
                  Amanhã
                </button>
              </div>
            </div>

            {/* CABEÇALHO DIAS DA SEMANA */}
            <div className="grid grid-cols-7 text-center">
              {DIAS_SEMANA.map((d) => (
                <span key={d} className="text-[11px] font-medium text-zinc-500 py-1">
                  {d}
                </span>
              ))}
            </div>

            {/* GRID DO MÊS */}
            <div className="grid grid-cols-7 gap-1">
              {celulasVazias.map((_, i) => (
                <div key={`v-${i}`} className="aspect-square" />
              ))}
              {diasDoMes.map((dia) => {
                const mm = String(calMonth + 1).padStart(2, '0');
                const dd = String(dia).padStart(2, '0');
                const isoDate = `${calYear}-${mm}-${dd}`;
                const selecionado = dataSelecionada === isoDate;
                const isHoje = todayStr === isoDate;
                const temAgendamento = diasComAgendamento.has(isoDate);

                return (
                  <button
                    key={dia}
                    onClick={() => selecionarDia(dia)}
                    className={`aspect-square relative flex flex-col items-center justify-center rounded-lg text-xs font-medium transition cursor-pointer ${
                      selecionado
                        ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                        : isHoje
                        ? 'border border-amber-500/50 text-amber-400 hover:bg-zinc-800'
                        : 'hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span>{dia}</span>
                    {/* Indicador sutil de agendamentos no dia */}
                    {temAgendamento && (
                      <span
                        className={`w-1 h-1 rounded-full absolute bottom-1.5 ${
                          selecionado ? 'bg-zinc-950' : 'bg-amber-400'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Com clientes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border border-amber-500/60 rounded inline-block" /> Hoje
              </span>
            </div>
          </div>

          {/* LISTA DE AGENDAMENTOS DO DIA */}
          <div className="space-y-4">
            {/* TÍTULO DA DATA SELECIONADA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800/80 gap-2">
              <div>
                <h2 className="text-base font-semibold text-zinc-100 capitalize">
                  {formatarDataExtenso(dataSelecionada)}
                </h2>
                <p className="text-xs text-zinc-400">
                  {agendamentos.length === 0
                    ? 'Nenhum horário marcado'
                    : `${agendamentos.length} cliente${agendamentos.length > 1 ? 's' : ''} agendado${agendamentos.length > 1 ? 's' : ''}`}
                </p>
              </div>

              {agendamentos.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{agendamentos.length} horários ocupados</span>
                </div>
              )}
            </div>

            {/* CONTEÚDO DOS AGENDAMENTOS */}
            {carregando ? (
              <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
                Carregando horários...
              </div>
            ) : agendamentos.length === 0 ? (
              <div className="py-16 text-center bg-zinc-900/40 border border-zinc-800/60 rounded-2xl space-y-2">
                <CalendarIcon className="w-8 h-8 text-zinc-700 mx-auto" />
                <p className="text-sm font-medium text-zinc-400">Sem agendamentos nesta data</p>
                <p className="text-xs text-zinc-600 max-w-xs mx-auto">
                  Os agendamentos feitos pelos clientes no site aparecerão aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {agendamentos.map((a) => (
                  <div
                    key={a.id}
                    className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-zinc-700 transition"
                  >
                    {/* Bloco de Horário */}
                    <div className="flex items-center gap-3 sm:w-28 shrink-0">
                      <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-100 text-sm">{a.horario_inicio.slice(0, 5)}</p>
                        <p className="text-[11px] text-zinc-500">até {a.horario_fim.slice(0, 5)}</p>
                      </div>
                    </div>

                    <div className="hidden sm:block w-px h-10 bg-zinc-800" />

                    {/* Informações do Cliente & Serviço */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="font-medium text-zinc-100 text-sm truncate">{a.cliente_nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="text-zinc-400 text-xs font-mono">{a.cliente_telefone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="text-zinc-400 text-xs truncate">{a.servico_nome}</span>
                        <span className="ml-auto font-medium text-amber-400 text-xs">
                          R$ {a.servico_preco},00
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                      <button
                        onClick={() => abrirWhatsApp(a)}
                        title="Enviar lembrete pelo WhatsApp"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 hover:bg-emerald-900/60 transition text-xs font-medium cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Lembrar cliente
                      </button>
                      <button
                        onClick={() => setConfirmDelete(a.id)}
                        title="Remover agendamento"
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-red-950/40 border border-zinc-700/50 hover:border-red-900/50 text-zinc-400 hover:text-red-400 transition text-xs font-medium cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="sm:hidden">Cancelar</span>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-semibold text-zinc-100 text-base">Cancelar agendamento?</h3>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Essa ação removerá o agendamento do banco de dados e liberará o horário para outros clientes.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition text-xs font-medium cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => cancelarAgendamento(confirmDelete)}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition text-xs cursor-pointer"
              >
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
